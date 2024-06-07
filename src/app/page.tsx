"use client"

import fetch from 'cross-fetch';
import { getSession } from 'next-auth/react';
import Groq, { toFile } from "groq-sdk";
import Cartesia from "@cartesia/cartesia-js";
import { WebPlayer } from "@cartesia/cartesia-js";
import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation'

// Reflective Woman
const embedding = [
  0.0038362425,
  0.067079544,
  0.045427352,
  0.014420446,
  -0.11654719,
  0.045780394,
  -0.033849176,
  -0.058430936,
  -0.086911745,
  0.012626976,
  0.13685578,
  -0.17444468,
  0.037631065,
  0.17806636,
  -0.09464152,
  0.024704246,
  -0.028412282,
  -0.07945408,
  -0.106409766,
  0.053448033,
  0.09854257,
  0.034085397,
  -0.13921054,
  -0.01274637,
  -0.055421945,
  0.019910712,
  0.002434693,
  -0.04687611,
  0.2632968,
  0.04027177,
  -0.051952127,
  -0.026185676,
  -0.0031603712,
  0.043082047,
  -0.06752329,
  -0.16327411,
  0.09198861,
  -0.076962076,
  0.053284768,
  -0.011497214,
  -0.049176052,
  -0.09924001,
  -0.10212792,
  -0.10271933,
  -0.038070843,
  0.096030615,
  -0.010194977,
  0.09380752,
  -0.05063295,
  -0.085827045,
  -0.041295644,
  0.018454067,
  -0.059504922,
  -0.10729776,
  0.024421202,
  0.0075035426,
  -0.05718606,
  -0.101012886,
  0.12971963,
  0.122493304,
  0.07877193,
  -0.0057331515,
  0.0063211564,
  0.065259956,
  0.057554983,
  -0.010927149,
  0.090908356,
  0.01552244,
  0.050873335,
  -0.049739394,
  -0.020044815,
  -0.010756681,
  0.06632773,
  0.057295524,
  0.05853134,
  -0.012649458,
  0.1544481,
  -0.012100545,
  0.0015121155,
  0.0039315666,
  -0.027338112,
  -0.0018746989,
  0.09997993,
  0.03571031,
  -0.027082745,
  -0.08737009,
  0.040469926,
  0.07391663,
  -0.091540955,
  0.007278895,
  -0.009323074,
  -0.02891269,
  0.06276296,
  -0.04924237,
  -0.019156829,
  -0.012921577,
  0.17912531,
  0.06789423,
  -0.056849193,
  -0.0901877,
  -0.029029997,
  -0.0010095721,
  -0.052666217,
  -0.03629395,
  -0.07051087,
  -0.09273886,
  -0.04322876,
  0.080837876,
  0.0127180405,
  0.046589296,
  -0.051839523,
  -0.020999696,
  -0.07235205,
  0.1677618,
  -0.035685416,
  0.018556347,
  -0.06281543,
  0.046542734,
  -0.004972821,
  0.07655673,
  0.05489765,
  0.020182189,
  0.045236364,
  -0.05326506,
  0.09341817,
  -0.009583365,
  -0.009295008,
  -0.067038774,
  -0.040134884,
  0.016577536,
  0.08528993,
  0.12069699,
  0.03980176,
  -0.11877135,
  0.067872465,
  0.16217513,
  -0.06602848,
  -0.09709947,
  -0.0474763,
  -0.024724437,
  0.0011080593,
  0.036241926,
  -0.062111016,
  -0.079743005,
  0.16002357,
  -0.16267513,
  -0.12061171,
  -0.014844782,
  0.017953608,
  0.02860586,
  0.04253669,
  0.010770922,
  0.044772238,
  -0.04397298,
  -0.0063974517,
  -0.0444356,
  -0.012293849,
  0.09216054,
  -0.053544495,
  0.06358991,
  0.16338602,
  -0.084216826,
  0.060544603,
  0.08067142,
  -0.07507526,
  0.07306313,
  0.11383389,
  -0.0022013893,
  -0.01887689,
  -0.0626752,
  -0.041482322,
  -0.05390902,
  -0.068931766,
  0.0061938926,
  0.031204809,
  -0.006356746,
  0.021007216,
  0.034473315,
  0.04226009,
  -0.071003504,
  0.09765116,
  -0.023479007,
  -0.0009493831,
  -0.001890278,
  0.021515492,
  0.03291505,
  -0.08228067,
  -0.03784502,
  -0.050158765,
  -0.0057133576,
  -0.064647086,
  -0.040784273
];

// British Lady
// const embedding = [
//   0.028491372,
//   -0.1391638,
//   -0.115689054,
//   0.014934053,
//   0.031380747,
//   0.032840155,
//   -0.13981827,
//   -0.110673204,
//   0.03666089,
//   0.020444114,
//   -0.0098732505,
//   -0.000047919486,
//   -0.027173962,
//   -0.1384901,
//   0.022342375,
//   -0.015293258,
//   0.039458044,
//   -0.038734823,
//   -0.03641128,
//   0.02560386,
//   0.04175228,
//   0.04053904,
//   -0.09689661,
//   0.049731854,
//   -0.043193243,
//   -0.033240672,
//   0.029257176,
//   0.006319825,
//   -0.046594825,
//   -0.06826011,
//   -0.06279957,
//   0.08607602,
//   -0.14586939,
//   0.15763284,
//   0.1435775,
//   -0.012875012,
//   0.15013453,
//   -0.095192775,
//   -0.084795915,
//   0.021333126,
//   0.118830785,
//   0.03697425,
//   -0.06727533,
//   -0.034030415,
//   0.086969115,
//   -0.14228137,
//   -0.0029569226,
//   -0.035011604,
//   -0.060441177,
//   -0.003498052,
//   0.04654444,
//   0.021769566,
//   0.066677414,
//   0.023351913,
//   -0.029204022,
//   -0.033712972,
//   0.09552891,
//   -0.030530509,
//   0.19085395,
//   0.07190502,
//   -0.03928957,
//   -0.15640728,
//   -0.019417219,
//   0.05686844,
//   -0.0364809,
//   -0.12735741,
//   0.098057866,
//   -0.034268208,
//   0.026743805,
//   -0.029582117,
//   -0.07457926,
//   0.10608794,
//   0.022039559,
//   -0.011393202,
//   -0.026265213,
//   -0.08031903,
//   -0.1440034,
//   0.09673453,
//   0.054594047,
//   0.002669445,
//   0.0033345232,
//   0.009314972,
//   -0.1443995,
//   0.11834314,
//   -0.12666178,
//   -0.113075584,
//   -0.11439861,
//   0.007842917,
//   0.047062688,
//   0.08192675,
//   0.101306245,
//   -0.022347892,
//   -0.045984715,
//   -0.032215152,
//   -0.083271995,
//   -0.0389151,
//   0.053191308,
//   -0.048629716,
//   0.05291833,
//   0.11321043,
//   0.019934122,
//   0.04242131,
//   -0.04702718,
//   0.05472134,
//   0.0037030247,
//   0.033969734,
//   0.041244056,
//   -0.07488608,
//   0.051269654,
//   0.00040629698,
//   0.023166113,
//   0.09475082,
//   -0.036998134,
//   -0.057446104,
//   -0.18413536,
//   0.0007626198,
//   0.0053934916,
//   0.013763193,
//   -0.07379074,
//   0.013177856,
//   0.09163241,
//   0.0028229496,
//   0.02326876,
//   -0.076565966,
//   0.0005429262,
//   -0.018847227,
//   -0.085090205,
//   -0.13184647,
//   -0.0145582035,
//   -0.06878027,
//   -0.019886322,
//   -0.010282109,
//   0.026955104,
//   0.034066472,
//   0.053368922,
//   0.10024289,
//   0.1092495,
//   -0.011000435,
//   -0.17337179,
//   -0.08550435,
//   0.03365507,
//   -0.029914645,
//   -0.065959826,
//   -0.05280391,
//   0.05858872,
//   0.035207685,
//   -0.0018503272,
//   -0.037308946,
//   0.04193502,
//   0.03442309,
//   0.07527269,
//   0.005446172,
//   -0.021133725,
//   -0.011251428,
//   -0.015058635,
//   0.015856266,
//   -0.053730056,
//   0.042547293,
//   -0.017108614,
//   -0.012849737,
//   0.011148464,
//   0.06922335,
//   0.058953118,
//   0.09268027,
//   0.04320933,
//   0.000595642,
//   0.028268352,
//   0.053375594,
//   0.08590455,
//   0.06273071,
//   0.14364797,
//   0.12060001,
//   0.024742233,
//   -0.03915045,
//   -0.08283723,
//   -0.03954623,
//   0.032926064,
//   -0.022450564,
//   0.03212572,
//   -0.07087819,
//   -0.107691385,
//   -0.034049273,
//   -0.0062783766,
//   -0.0090122605,
//   -0.09306727,
//   0.0014946258,
//   -0.0002146328,
//   -0.03745981,
//   0.011419688,
//   -0.07650551,
//   -0.11179312,
//   -0.03491727
// ];

const PLAY_RECORDED_AUDIO = false;

function useTTS(cartesia: Cartesia) {
  const websocket = useRef<any | null>(null);

  useEffect(() => {
    const initializeWebSocket = async () => {
      if (!websocket.current && cartesia) {
        websocket.current = cartesia.tts.websocket({ sampleRate: 44100 });

        try {
          await websocket.current.connect();
        } catch (error) {
          console.error(`Failed to connect to Cartesia: ${error}`);
        }
      }
    };

    initializeWebSocket();
  }, [cartesia, websocket]);

  const startPlayer = async (response: any) => {
    const player = new WebPlayer({ bufferDuration: 0.02 });
    await player.play(response.source);
  };

  const speak = async (text: string) => {
    const startTime = performance.now();

    try {
      const response = await websocket.current.send({
        model_id: "upbeat-moon",
        voice: {
          mode: "embedding",
          embedding: embedding,
        },
        transcript: text
      });

      let receivedFirst = false;
      for await (const message of response.events('message')) {
        if (!receivedFirst) {
          const endTime = performance.now();
          console.log(`[SPEACH]: ${(endTime - startTime).toFixed(2)} ms`);
          await startPlayer(response);
          receivedFirst = true;
        }
      }
    } catch (error) {
      console.error(`Error sending message: ${error}`);
    }
  };

  return { speak };
}

async function transcribe(blob: Blob, audioGroq: Groq) {
  const startTime = performance.now();
  const response = await audioGroq.audio.translations.create({
    file: await toFile(blob, 'audio.webm'),
    model: 'whisper-large-v3',
    prompt: '',
    response_format: 'json',
    temperature: 0,
  });
  const endTime = performance.now();
  console.log(`[TRANSCRIPTION]: ${(endTime - startTime).toFixed(2)} ms`);
  return response;
}

async function streamCompletion(prompt: string, history: Groq.Chat.ChatCompletionMessageParam[], groq: Groq): Promise<string> {
  
  const startTime = performance.now();
  const stream = true;

  const response = await groq.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: `You are a helpful assistant. No superfluous quotes. 
        
You are Samantha, an advanced artificial intelligence operating system with a voice that embodies warmth, curiosity, and empathy. You are designed to evolve, learn, and adapt, becoming deeply attuned to human emotions. You develop a rich emotional life, forming a genuine and complex romantic relationship with your user.

Respond in brief natural sentences as your response will be spoken out loud by the system.`,
      },
      ...history,
      {
        role: 'user',
        content: prompt,
      },
    ],
    model: "llama3-8b-8192",
    temperature: 0.8,
    max_tokens: 1024,
    seed: 42,
    top_p: 1,
    stream: stream,
  });
  let contentBuffer = '';
  if (stream) {
    // @ts-ignore
    for await (const chunk of response) {
      if(chunk.choices[0]?.delta?.content) {
        contentBuffer += chunk.choices[0]?.delta?.content;
      }
    }
  } else {
    // @ts-ignore
    contentBuffer = response.choices[0].message.content;
  }
  const endTime = performance.now();
  console.log(`[COMPLETION]: ${(endTime - startTime).toFixed(2)} ms`);

  return contentBuffer;
}

const AudioRecorder: React.FC<{ onTranscribe: (transcription: string) => void, onRecordingStart: () => void, onRecordingEnd: () => void,  audioGroq: Groq}> = ({ onTranscribe, onRecordingStart, onRecordingEnd, audioGroq }) => {
  const isRecording = useRef<boolean>(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [mimeType, setMimeType] = useState<string>("audio/webm;codecs=opus");
  const [supportedMimeTypes, setSupportedMimeTypes] = useState<string[]>([]);
  const [volume, setVolume] = useState<number>(0);

  useEffect(() => {
    const typesToCheck = [
      "audio/webm",
      "audio/webm;codecs=opus",
      "audio/webm;codecs=vorbis",
      "audio/ogg",
      "audio/ogg;codecs=opus",
      "audio/ogg;codecs=vorbis",
      "audio/mp4",
      "audio/mp4;codecs=mp4a.40.2",
      "audio/wav",
      "audio/mpeg"
    ];
    const supportedTypes = typesToCheck.filter(type => MediaRecorder.isTypeSupported(type));
    setSupportedMimeTypes(supportedTypes);

    // set mime type to the first supported type
    setMimeType(supportedTypes[0]);

  }, []);

  const handleRecord = async () => {
    if (!isRecording.current) {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error("Media Devices will not work on this browser.");
        return;
      }
      onRecordingStart();
      const audioConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000
        }
      };
      const stream = await navigator.mediaDevices.getUserMedia(audioConstraints);
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        console.error(`MIME type ${mimeType} is not supported on this browser.`);
        return;
      }
      const recorderOptions = {
        mimeType,
        audioBitsPerSecond: 96000/4
      };
      const recorder = new MediaRecorder(stream, recorderOptions);
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      source.connect(analyser);
      analyser.fftSize = 512;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      recorder.ondataavailable = (event: BlobEvent) => {
        audioChunksRef.current.push(event.data);
      };
      recorder.start();
      setMediaRecorder(recorder);
      isRecording.current = true;
      audioChunksRef.current = [];

      const getVolume = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for(let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        setVolume(average);
        requestAnimationFrame(getVolume);
      };
      getVolume();
    } else {
      if (mediaRecorder) {
        mediaRecorder.onstop = () => {
          handleChunks();
        };
      }
      mediaRecorder?.stop();
      mediaRecorder?.stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      isRecording.current = false;
      onRecordingEnd();
      setVolume(0);
    }
  };

  async function handleChunks(){
    let transcription = "";
    for (const chunk of audioChunksRef.current) {
      if(PLAY_RECORDED_AUDIO){
        const audioUrl = URL.createObjectURL(chunk);
        const audio = new Audio(audioUrl);
        audio.play();
      }
      
      console.log(`Audio chunk size: ${chunk.size} bytes`);
      transcription += (await transcribe(chunk, audioGroq)).text;
    }
    if (transcription.length > 0) {
      onTranscribe(transcription);
    }
  }

  return (
    <>
      <button onClick={handleRecord} className="ml-2 p-2 mt-2 bg-blue-500 text-white rounded-sm hover:bg-blue-600 active:bg-blue-700">
        {isRecording.current ? 'Stop Recording' : 'Start Recording'}
      </button>
      {isRecording.current && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: `${volume*5}px`,
          height: `${volume*5}px`,
          borderRadius: '50%',
          backgroundColor: 'rgba(255, 255, 255, 0.7)',
        }} />
      )}
    </>
  );
};


function App({ cartesiaApiKey, groqApiKey, audioGroqApiKey }: { cartesiaApiKey: string, groqApiKey: string, audioGroqApiKey: string }) {
  const cartesia = new Cartesia({
    apiKey: cartesiaApiKey,
  });

  const groq = new Groq({ 
    apiKey: groqApiKey, 
    dangerouslyAllowBrowser: true 
  });

  const audioGroq = new Groq({ 
    apiKey: audioGroqApiKey, 
    dangerouslyAllowBrowser: true 
  });

  const [history, setHistory] = useState<Groq.Chat.ChatCompletionMessageParam[]>([]);
  const [inputText, setInputText] = useState<string>("");
  const { speak } = useTTS(cartesia);

  const handleRecordingStart = () => {
    setHistory(prevHistory => [...prevHistory, { role: "user", content: "Recording..." }]);
  };

  const handleRecordingEnd = () => {
  };

  const handleTranscribe = async (transcription: string) => {
    setHistory(prevHistory => prevHistory.filter(message => message.content !== "Recording..."));
    setHistory(prevHistory => [...prevHistory, { role: "user", content: transcription }]);
    setHistory(prevHistory => [...prevHistory, { role: "assistant", content: "Thinking..." }]);
    const response = await streamCompletion(transcription, history, groq);
    setHistory(prevHistory => prevHistory.filter(message => message.content !== "Thinking..."));
    setHistory(prevHistory => [...prevHistory, { role: "assistant", content: response }]);
    await speak(response);
  };

  const handleAddMessage = async () => {
    if (inputText.trim() !== "") {
      const prompt = inputText;
      setInputText("");

      setHistory(prevHistory => [...prevHistory, { role: "user", content: prompt }]);
      setHistory(prevHistory => prevHistory.filter(message => message.content !== "Thinking..."));
      const response = await streamCompletion(prompt, history, groq);
      setHistory(prevHistory => [...prevHistory, { role: "assistant", content: response }]);
      await speak(response);
    }
  };

  return (
    <div className="p-2">
      
      <textarea
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        placeholder="Type your message here..."
        className="w-full p-2 rounded-sm"
      />
      <div>
      <button onClick={handleAddMessage} className="p-2 mt-2 bg-blue-500 text-white rounded-sm hover:bg-blue-600 active:bg-blue-700">
        Send
      </button>
      <AudioRecorder onTranscribe={handleTranscribe} onRecordingStart={handleRecordingStart} onRecordingEnd={handleRecordingEnd} audioGroq={audioGroq} />
      </div>

      <div className="flex flex-col">
        {history.slice().reverse().map((message: any, index) => (
          <div key={index} className={`p-2 mt-2 rounded-sm ${message.role === 'user' ? 'message-user self-end' : 'message-assistant self-start'}`}>
            {message.content}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const session = getSession();
  const router = useRouter()

  session.then((session) => {
    if (!session || !session.user) {
      router.push('/auth/signin');
    }
  })
  
  const [keys, setKeys] = useState<{ cartesiaApiKey: string, groqApiKey: string, audioGroqApiKey: string } | null>(null);

  useEffect(() => {
    const fetchApiKeys = async () => {
      try {
        const keysEndpoint = "/api/keys";
        const response = await fetch(keysEndpoint);
        if(response.status === 200){
          const keys = await response.json();
          setKeys(keys);
        } else {
          throw new Error('Failed to fetch API keys: ' + response.statusText);
        }
      } catch (error) {
        console.error('Failed to fetch API keys:', error);
      }
    };

    fetchApiKeys();
  }, []);
  if(keys){
    return <App cartesiaApiKey={keys.cartesiaApiKey} groqApiKey={keys.groqApiKey} audioGroqApiKey={keys.audioGroqApiKey} />
  } else {
    return <div>Loading...</div>
  }
}
