### Apache BEAM Solace Integration 

![Solace Apache Beam](static_assets/word-count-beam.png "Apache Beam Solace")

This is a very simple example of an Apache Beam Pipeline that allows you to stream text via Solace PubSub+ and get the results of a word count Beam processor through another stream.

### Setting up a Solace PubSub+ Broker with Docker

  
   * Download the Solace PubSub+ Standard Docker Container - https://products.solace.com/download/PUBSUB_DOCKER_STAND
   
   * Run the following commands (replace x.x.x.x with the Solace PubSub+ Broker version)
      ```
       >docker load -i .\solace-pubsub-standard-x.x.x.x-docker.tar.gz
       >docker run -d -p 80:80 -p 8080:8080 -p 55555:55555 --shm-size=2g --env username_admin_global
       accesslevel=admin --env username_admin_password=admin  --name=solace solace-pubsub-standard:x.x.x.x
      ```
      
   * Run the following maven commands - 
        ```
            >mvn clean install
            >mvn exec:exec
        ```
    
   * Got web_assets\BeamPubSub.html and  type text into the TextArea and Click 'Publish Message'.     
     The text will get sent to Apache Beam and results will be streamed back!
   
   ![Solace Apache Beam](static_assets/apache-beam-solace.gif "Solace APache Beam")




