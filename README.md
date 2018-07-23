### Apache BEAM Solace Integration 

These repos contain two very simple examples on how to integrate streams with Apache BEAM through the Solace PubSub+ Software Broker. 

### Setting up a Solace PubSub+ Broker with Docker

  
   * Download the Solace PubSub+ Standard Docker Container - https://products.solace.com/download/PUBSUB_DOCKER_STAND
   
   * Run the following commands (replace x.x.x.x with the Solace PubSub+ Broker version)
      ```
       >docker load -i .\solace-pubsub-standard-x.x.x.x-docker.tar.gz
       >docker run -d -p 80:80 -p 8080:8080 -p 55555:55555 --shm-size=2g --env username_admin_global
       accesslevel=admin --env username_admin_password=admin  --name=solace solace-pubsub-standard:x.x.x.x
      ```


### Running the word count stream processing example
This is a very simple example of an Apache Beam Pipeline that allows you to stream text via Solace PubSub+ and get the results of a word count Beam processor through another stream.

![Solace Apache Beam](web_assets/word-count-beam.png "Apache Beam Solace")

To run the example locally:
      
   * Run the following maven commands - 
        ```
            >mvn clean install
            >mvn exec:java -D"exec.mainClass"="com.solace.beam.sample.StreamingWordCount"
        ```
    
   * Got web_assets\BeamPubSubWordCount.html and  type text into the TextArea and Click 'Publish Message'.     
     The text will get sent to Apache Beam and results will be streamed back!
   
### Running the moving average stream processing example
![Solace Apache Beam](web_assets/word-count-moving-average.png "Apache Beam Solace")
 This is a very simple example of an Apache Beam pipeline that calculates averages of simulated stock prices over a 5 second window.

To run the example locally:

   * Run the following maven commands - 
        ```
            >mvn clean install
            >mvn exec:java -D"exec.mainClass"="com.solace.beam.sample.StreamingMovingAverage"
            >mvn exec:java -D"exec.mainClass"="com.solace.beam.sample.PriceSimulator"
        ```
    
   * Got web_assets\BeamPubSubMovingAverage.html and you will automatically see the results of the moving average streamed to the chart!
