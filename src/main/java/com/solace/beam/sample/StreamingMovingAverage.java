package com.solace.beam.sample;

/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import org.apache.beam.sdk.Pipeline;
import org.apache.beam.sdk.PipelineResult;
import org.apache.beam.sdk.io.jms.JmsIO;
import org.apache.beam.sdk.io.jms.JmsRecord;
import org.apache.beam.sdk.metrics.Counter;
import org.apache.beam.sdk.metrics.Metrics;
import org.apache.beam.sdk.options.*;
import org.apache.beam.sdk.transforms.*;
import org.apache.beam.sdk.transforms.windowing.AfterProcessingTime;
import org.apache.beam.sdk.transforms.windowing.AfterWatermark;
import org.apache.beam.sdk.transforms.windowing.FixedWindows;
import org.apache.beam.sdk.transforms.windowing.Window;
import org.apache.beam.sdk.values.KV;
import org.apache.beam.sdk.values.PCollection;
import org.apache.qpid.jms.JmsConnectionFactory;
import org.joda.time.Duration;

import javax.jms.ConnectionFactory;
import javax.jms.JMSException;
import java.io.IOException;

public class StreamingMovingAverage {
    static final int WINDOW_SIZE = 5;  // Default window duration in minutes

    static final int MOVING_AVERAGE_PERIOD = 10; //Default period for Moving Averages


    /**
     * A {@link DefaultValueFactory} that returns the current system time.
     */
    public static class DefaultToCurrentSystemTime implements DefaultValueFactory<Long> {
        @Override
        public Long create(PipelineOptions options) {
            return System.currentTimeMillis();
        }
    }

    static class ExtractPricesFn extends DoFn<JmsRecord, Double> {
        private final Counter emptyLines = Metrics.counter(StreamingWordCount.ExtractWordsFn.class, "emptyLines");

        @ProcessElement
        public void processElement(ProcessContext c) throws JMSException {

            String messageString =  c.element().getPayload();
            if (messageString.trim().isEmpty()) {
                emptyLines.inc();
            }


           //Convert the payload into Longs
           Double stockPrice = Double.valueOf(c.element().getPayload().toString());

            c.output(stockPrice);

        }
    }

    public static class AveragePrices extends PTransform<PCollection<JmsRecord>,
            PCollection<Double>> {
        @Override
        public PCollection<Double> expand(PCollection<JmsRecord> jmsPrices) {

            PCollection<Double>  prices = jmsPrices.apply(ParDo.of(new ExtractPricesFn()));

            return  prices.apply(Mean.<Double>globally().withoutDefaults());
        }
    }


    /**
     * Options for {@link StreamingWordCount}.
     * <p>
     * <p>Defaults all the settings with regards to AMQP Connectivity to Solace to the defaults. Can be customized by running --[option]=value as Program Arguments
     */
    public interface Options extends PipelineOptions {
        @Description("Fixed window duration, in minutes")
        @Default.Integer(WINDOW_SIZE)
        Integer getWindowSize();

        void setWindowSize(Integer value);

        @Description("Solace-User")
        @Default.String("default")
        String getSolaceUser();

        void setSolaceUser(String solaceUser);

        @Description("Solace-Password")
        @Default.String("default")
        String getSolacePassword();

        void setSolacePassword(String solacePassword);

        @Description("Solace-URL")
        @Default.String("amqp://localhost:5672")
        String getSolaceURL();

        void setSolaceURL(String solaceUrl);

        @Description("Solace-Moving-Averages-Read-Topic")
        @Default.String("SOLACE/BEAM/PRICES")
        String getSolaceReadTopic();
        void setSolaceReadTopic(String solaceReadTopic);

        @Description("Solace-Moving-Averages-Write-Topic")
        @Default.String("SOLACE/BEAM/AVERAGES")
        String getSolaceWriteTopic();

        void setSolaceWriteTopic(String solaceWriteTopic);

    }

    public static void main(String[] args) throws IOException {
       Options options = PipelineOptionsFactory.fromArgs(args).withValidation().as(Options.class);


        Pipeline pipeline = Pipeline.create(options);

        //Setting up an AMQP QPID JMS Connection Factory
        ConnectionFactory solaceConnectionFactory = new JmsConnectionFactory(options.getSolaceUser(), options.getSolacePassword(), options.getSolaceURL());


        pipeline
                //Setting a read connection to Solace
                .apply(JmsIO.read().withConnectionFactory(solaceConnectionFactory).withTopic(options.getSolaceReadTopic()))
                //Windowing the results over the window size (30L)
                .apply(Window.<JmsRecord>into(FixedWindows.of(Duration.standardSeconds(options.getWindowSize()))).triggering(
                        AfterWatermark.pastEndOfWindow()
                                .withEarlyFirings(AfterProcessingTime
                                        .pastFirstElementInPane().plusDelayOf(Duration.standardSeconds(options.getWindowSize()))))
                        .withAllowedLateness(Duration.ZERO).discardingFiredPanes())
                //Count the words
                .apply(new AveragePrices())
                .apply("Create JSON String of avg price",ParDo.of(new DoFn<Double,String>(){
                    @ProcessElement
                    public void processElement(ProcessContext c){
                        if(!c.element().isNaN())
                            c.output("{\"price\":\""+ c.element() + "\",\"timestamp\":\"" + c.timestamp().getMillis()+"\"}");
                    }
                }))
                //Write the results to a JMS Topic
                .apply(JmsIO.write().withConnectionFactory(solaceConnectionFactory).withTopic(options.getSolaceWriteTopic()));

        PipelineResult result = pipeline.run();
        try {
            result.waitUntilFinish();
        } catch (Exception exc) {
            result.cancel();
        }
    }
}

