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
package org.apache.beam.examples;

import org.apache.beam.sdk.Pipeline;
import org.apache.beam.sdk.PipelineResult;
import org.apache.beam.sdk.io.jms.JmsIO;
import org.apache.beam.sdk.io.jms.JmsRecord;
import org.apache.beam.sdk.metrics.Counter;
import org.apache.beam.sdk.metrics.Distribution;
import org.apache.beam.sdk.metrics.Metrics;
import org.apache.beam.sdk.options.*;
import org.apache.beam.sdk.transforms.*;
import org.apache.beam.sdk.transforms.windowing.FixedWindows;
import org.apache.beam.sdk.transforms.windowing.Window;
import org.apache.beam.sdk.values.KV;
import org.apache.beam.sdk.values.PCollection;
import org.apache.qpid.jms.JmsConnectionFactory;
import org.joda.time.Duration;

import javax.jms.ConnectionFactory;
import javax.jms.JMSException;
import java.io.IOException;
import java.time.LocalDateTime;

/**
 * An example that counts words in text, and can run over either unbounded or bounded input
 * collections.
 * <p>
 * <p>This is a slightly modified example of the examples from the official Apache Beam sample repo that connects
 * to Solace PubSub+ via Apache Qpid JMS.
 * <p>
 * <p>
 * This sample reads a stream of Text from a well defined topic, parses it into a PCollection, and writes it back as a stream
 * to Solace PubSub+.
 * <p>You can specify a local output file (if using the
 * {@code DirectRunner})
 * <pre>{@code
 *   --output=[YOUR_LOCAL_FILE | YOUR_OUTPUT_PREFIX]
 * }</pre>
 * <p>
 * <p>
 * <p>By default, the pipeline will do fixed windowing, on 1-minute windows.  You can
 * change this interval by setting the {@code --windowSize} parameter, e.g. {@code --windowSize=10}
 * for 10-minute windows.
 * <p>
 * <p>The example will try to cancel the pipeline on the signal to terminate the process (CTRL-C).
 */
public class StreamingWordCount {
    static final int WINDOW_SIZE = 5;  // Default window duration in minutes

    /**
     * A {@link DefaultValueFactory} that returns the current system time.
     */
    public static class DefaultToCurrentSystemTime implements DefaultValueFactory<Long> {
        @Override
        public Long create(PipelineOptions options) {
            return System.currentTimeMillis();
        }
    }


    static class ExtractWordsFn extends DoFn<JmsRecord, String> {
        private final Counter emptyLines = Metrics.counter(ExtractWordsFn.class, "emptyLines");
        private final Distribution lineLenDist = Metrics.distribution(
                ExtractWordsFn.class, "lineLenDistro");

        @ProcessElement
        public void processElement(ProcessContext c) throws JMSException {

            String messageString =  c.element().getPayload();
            lineLenDist.update(messageString.length());
            if (messageString.trim().isEmpty()) {
                emptyLines.inc();
            }

            // Split the line into words.
            String[] words = messageString.split("[^\\p{L}]+");

            // Output each word encountered into the output PCollection.
            for (String word : words) {
                if (!word.isEmpty()) {
                    c.output(word);
                }
            }
        }
    }


    public static class CountWords extends PTransform<PCollection<JmsRecord>,
            PCollection<KV<String, Long>>> {
        @Override
        public PCollection<KV<String, Long>> expand(PCollection<JmsRecord> lines) {




            // Convert lines of text into individual words.
            PCollection<String> words = lines.apply(
                    ParDo.of(new ExtractWordsFn()));

            // Count the number of times each word occurs.
            PCollection<KV<String, Long>> wordCounts = words.apply(Count.perElement());

            return wordCounts;
        }
    }



    /**
     * A SimpleFunction that converts a Word and Count into a printable string.
     */
    public static class FormatAsTextFn extends SimpleFunction<KV<String, Long>, String> {
        @Override
        public String apply(KV<String, Long> input) {
            return "{\"word\":\""+input.getKey() + "\", \"count\":\"" + input.getValue()+"\"";
        }
    }

    /**
     * Options for {@link StreamingWordCount}.
     * <p>
     * <p>Inherits standard example configuration options, which allow specification of the
     * specification of the input and output files.
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

        @Description("Solace-Read-Topic")
        @Default.String("SOLACE/BEAM/WRITE")
        String getSolaceReadTopic();

        void setSolaceReadTopic(String solaceReadTopic);

        @Description("Solace-Write-Topic")
        @Default.String("SOLACE/BEAM/READ")
        String getSolaceWriteTopic();

        void setSolaceWriteTopic(String solaceWriteTopic);

    }

    public static void main(String[] args) throws IOException {
        Options options = PipelineOptionsFactory.fromArgs(args).withValidation().as(Options.class);


        Pipeline pipeline = Pipeline.create(options);

        ConnectionFactory solaceConnectionFactory = new JmsConnectionFactory(options.getSolaceUser(), options.getSolacePassword(), options.getSolaceURL());


        PCollection<KV<String, Long>> wordCounts = pipeline
                .apply(JmsIO.read().withConnectionFactory(solaceConnectionFactory).withTopic(options.getSolaceReadTopic()))
                .apply(Window.into(FixedWindows.of(Duration.standardSeconds(30L))))
                .apply(new CountWords());
        wordCounts
                .apply(MapElements.via(new FormatAsTextFn()))
                .apply("StringCombination", ParDo.of(new DoFn<String, String>() {
                    @ProcessElement
                    public void processElement(ProcessContext c){
                       c.output(c.element() + ",\"timestamp\":\"" + c.timestamp()+"\"}");
                    }
                }))
//                .apply("PrintFn",ParDo.of(new DoFn<String,Void>(){
//                        @ProcessElement
//                        public void processElement(ProcessContext c){
//                            System.out.println(c.element());
//                        }
//                }));
                .apply(JmsIO.write().withConnectionFactory(solaceConnectionFactory).withTopic(options.getSolaceWriteTopic()));

        PipelineResult result = pipeline.run();
        try {
            result.waitUntilFinish();
        } catch (Exception exc) {
            result.cancel();
        }
    }

}
