package com.solace.beam.sample;

import org.apache.beam.sdk.options.Default;
import org.apache.beam.sdk.options.Description;
import org.apache.beam.sdk.options.PipelineOptions;
import org.apache.beam.sdk.options.PipelineOptionsFactory;
import org.apache.qpid.jms.JmsConnectionFactory;
import org.apache.qpid.jms.JmsTopic;

import javax.jms.*;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Timer;
import java.util.TimerTask;

public class PriceSimulator {


    public interface Options extends PipelineOptions {

        @Description("Publication-Rate")
        @Default.Integer(1)
        Integer getPublicationRate();

        void setPublicationRate(Integer publicationRate);

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


    }


    public static void main(String[] args) throws JMSException {

        final Double initPrice = 1197.88;

        Options options = PipelineOptionsFactory.fromArgs(args).withValidation().as(Options.class);
        JmsConnectionFactory solaceConnectionFactory = new JmsConnectionFactory(options.getSolaceUser(), options.getSolacePassword(), options.getSolaceURL());
        Connection connection = solaceConnectionFactory.createConnection();
        connection.start();
        JMSContext context = solaceConnectionFactory.createContext();
        final Topic priceTopic = context.createTopic(options.getSolaceReadTopic());
        JMSProducer messageProducer = context.createProducer();

        Timer timer = new Timer();
        timer.schedule(new TimerTask() {
            Double currentPrice = initPrice;

            @Override
            public void run() {
                Double volatility = 0.001;
                Double rnd = Math.random(); // generate number, 0 <= x < 1.0
                Double changePercent = 2 * volatility * rnd;
                if (changePercent > volatility)
                    changePercent -= (2 * volatility);
                Double change_amount = currentPrice * changePercent;
                Double newPrice = currentPrice + change_amount;
                try {
                    TextMessage message = context.createTextMessage();
                    BigDecimal roundedPrice = BigDecimal.valueOf(newPrice)
                            .setScale(3, RoundingMode.HALF_UP);
                    message.setText(roundedPrice.toString());
                    messageProducer.send(priceTopic,message);
                } catch (JMSException e) {
                    e.printStackTrace();
                }
                currentPrice = newPrice;
            }
        }, 0, options.getPublicationRate()*1000);


    }

}
