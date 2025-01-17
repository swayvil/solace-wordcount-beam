## Apache BEAM AmqpIO Solace Integration 
This is a fork of [Solace Wordcount Beam sample](https://github.com/thomas-kunnumpurath/solace-wordcount-beam) which is using JmsIO.
This example is using AmqpIO:
- A message is published to "SOLACE/BEAM/WRITE" topic using a websocket
- The message is read from "SOLACE/BEAM/WRITE" queue using AmqpIO
- The processed output is sent to "SOLACE/BEAM/READ" queue using AmqpIO
- The output is read from "SOLACE/BEAM/READ" queue using a websocket

## How to use?
### On Solace broker
- Create a queue "SOLACE/BEAM/WRITE" which subscribes to "SOLACE/BEAM/WRITE" topic
- Create a queue "SOLACE/BEAM/READ"

### Build Solace-Wordcount-Beam server side
Apache Beam is working with Java 1.8:
```
export JAVA_HOME=<PATH to JDK 1.8 Home>
mvn clean install
```
On MacOS JDK Home can be in "/Library/Java/JavaVirtualMachines/jdk1.8.0_231.jdk/Contents/Home"

### Start Solace-Wordcount-Beam server side
```
mvn exec:java -D"exec.mainClass"="com.solace.beam.sample.StreamingWordCount"
```

### Configure Solace-Wordcount-Beam client side
Edit "BeamPubSub.js" variable values:
```
var hosturl = 'ws://localhost:60080';
var username = 'default';
var pass = 'default';
var vpn = 'default';
```

### Start Solace-Wordcount-Beam client side
In an Internet browser open "BeamPubSubWordCount.html".

## AmqpIO limits (non exhaustive list)
- Marked as "Experimental" which *["Signifies that a public API (public class, method or field) is subject to incompatible changes, or even removal, in a future release."](https://beam.apache.org/releases/javadoc/2.3.0/org/apache/beam/sdk/annotations/Experimental.html)*
- Uses in dependencies "org.apache.qpid.proton.messenger.Messenger", which is deprecated *["The Messenger API has been deprecated. We recommend you use the newer APIs available part of the current Qpid Proton release for new projects."](https://qpid.apache.org/proton/messenger.html)*
And was removed after tag [0.16.0](https://github.com/apache/qpid-proton-j/tree/0.16.0/proton-j/src/main/java/org/apache/qpid/proton/messenger)
- If Solace PB+ Message VPN has authentification setted, the connection can't be established and a [PN_SASL_FAIL](https://qpid.apache.org/releases/qpid-proton-j-0.33.2/api/org/apache/qpid/proton/engine/Sasl.SaslState.html) (negotiation failed) error message is returned

## License
This project is licensed under the Apache License, Version 2.0. - See the [LICENSE](LICENSE) file for details.
