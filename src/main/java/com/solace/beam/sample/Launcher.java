package com.solace.beam.sample;

import java.io.IOException;

public class Launcher {

    public static void main(String[] args) throws IOException {

        //Launch StreamingMovingAverage BEAM pipeline
        StreamingMovingAverage.run(args);
        //Launch StreamingWordCount BEAM pipeline
        StreamingWordCount.run(args);

    }

}
