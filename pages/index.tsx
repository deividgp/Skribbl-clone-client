import { Button, FormElement, getCssText, Input, Text } from '@nextui-org/react';
import type { NextPage, GetStaticProps, InferGetStaticPropsType } from 'next'
import Head from 'next/head'
import Image from 'next/image'
import { MutableRefObject, useEffect, useRef, useState } from 'react'
import io from "socket.io-client";
import styles from '../styles/Home.module.css'
import fs from "fs-extra"
import Countdown from 'react-countdown';
import { Message, User } from "../types";
const baseURL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:4000";

export const getStaticProps: GetStaticProps = async (context) => {
  const content = await fs.readFile("./words/English.json", "utf-8");
  const words = Object.keys(JSON.parse(content));

  return {
    props: {
      words,
    },
  }
};

const Home: NextPage = ({ words }: InferGetStaticPropsType<typeof getStaticProps>) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");
  const [chosenUsername, setChosenUsername] = useState(false);
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState<any>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const socketRef = useRef<any>(null);
  const countdownRef = useRef<Countdown>(null);
  const colour = useRef("black");
  const [width, setWidth] = useState(2);
  const prevX = useRef(0);
  const currX = useRef(0);
  const prevY = useRef(0);
  const currY = useRef(0);
  const flag = useRef(false);

  useEffect(() => {
    socketInitializer();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [messages])

  useEffect(() => {
    if (!chosenUsername)
      return;

    const canvas = canvasRef.current!;

    canvas.addEventListener("mousemove", move);
    canvas.addEventListener("mousedown", down);
    canvas.addEventListener("mouseup", up);
    canvas.addEventListener("mouseout", out);
    canvas.addEventListener("wheel", wheel);

    return () => {
      canvas.removeEventListener("mousemove", move);
      canvas.removeEventListener("mousedown", down);
      canvas.removeEventListener("mouseup", up);
      canvas.removeEventListener("mouseout", out);
      canvas.removeEventListener("wheel", wheel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chosenUsername, width]);

  const move = (event: MouseEvent) => {
    findxy('move', event);
  };

  const down = (event: MouseEvent) => {
    findxy('down', event);
  };

  const up = (event: MouseEvent) => {
    findxy('up', event);
  };

  const out = (event: MouseEvent) => {
    findxy('out', event);
  };

  const wheel = (event: WheelEvent) => {
    if (event.deltaY > 0 && width >= 2) {
      setWidth(width - 1);
    }
    else if (event.deltaY < 0 && width <= 9) {
      setWidth(width + 1);
    }
  };

  const handleNameSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    socketRef.current.auth = { username };
    socketRef.current.connect();
    socketRef.current.emit("get_messages");
    setChosenUsername(true);
  };

  const handleMessageSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    socketRef.current.emit("send_message", message);
    setMessages((current: any) => [...current, message]);
    setMessage("");
  };

  const socketInitializer = async () => {
    socketRef.current = io(baseURL, {
      autoConnect: false,
      withCredentials: true
    });

    socketRef.current.on("users", (data: any) => {
      setUsers(data);
    });

    socketRef.current.on("receive_messages", (data: any) => {
      console.log(data);
      setMessages(data);
    });

    socketRef.current.on("receive_message", (data: any) => {
      setMessages((current: any) => [...current, data]);
    });

    socketRef.current.on("receive_color", (data: any) => {

    });
  };

  const chooseColor = (color: string) => {
    colour.current = color;
    /*if (x == "white")
      //width = 14;
    else
      //width = 2;*/
  }

  const erase = () => {
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.clearRect(0, 0, 836, 627);
  };

  const findxy = (res: string, e: MouseEvent) => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    switch (res) {
      case "down":
        if (countdownRef.current?.isStarted() == true) {
          countdownRef.current?.stop();
        } else {
          countdownRef.current?.start();
        }

        prevX.current = currX.current;
        prevY.current = currY.current;
        currX.current = e.clientX - canvas.offsetLeft;
        currY.current = e.clientY - canvas.offsetTop;
        flag.current = true;
        ctx.beginPath();
        ctx.fillStyle = colour.current;
        ctx.fillRect(currX.current, currY.current, width, width);
        ctx.closePath();
        break;
      case "up":
      case "out":
        flag.current = false;
        break;
      case "move":
        if (flag.current) {
          prevX.current = currX.current;
          prevY.current = currY.current;
          currX.current = e.clientX - canvas.offsetLeft;
          currY.current = e.clientY - canvas.offsetTop;
          ctx.beginPath();
          ctx.moveTo(prevX.current, prevY.current);
          ctx.lineTo(currX.current, currY.current);
          ctx.strokeStyle = colour.current;
          ctx.lineWidth = width;
          ctx.stroke();
          ctx.closePath();
        }
        break;
    }
  };

  return (
    <div>
      <Head>
        <title>Skribbl clone</title>
      </Head>

      <main className={styles.main}>
        {chosenUsername
          ? (
            <div className={styles.game}>
              <div className={styles.usersList}>
                <ul>
                  {
                    users.map((user, index) => {
                      return (
                        <li key={index}>
                          {user}
                        </li>
                      )
                    })}
                </ul>
              </div>
              <div className={styles.drawing}>
                <Countdown ref={countdownRef} date={Date.now() + 120000} autoStart={false} renderer={props => <span>{props.minutes}:{props.seconds}</span>} />
                <Text aria-label='Choose color'>Width: {width}</Text>
                <span style={{ width: "20px", height: "20px", float: "left", background: "green" }} id="green" onClick={() => chooseColor("green")}></span>
                <span style={{ width: "20px", height: "20px", float: "left", background: "blue" }} id="blue" onClick={() => chooseColor("blue")}></span>
                <span style={{ width: "20px", height: "20px", float: "left", background: "red" }} id="red" onClick={() => chooseColor("red")}></span>
                <span style={{ width: "20px", height: "20px", float: "left", background: "yellow" }} id="yellow" onClick={() => chooseColor("yellow")}></span>
                <span style={{ width: "20px", height: "20px", float: "left", background: "orange" }} id="orange" onClick={() => chooseColor("orange")}></span>
                <span style={{ width: "20px", height: "20px", float: "left", background: "black" }} id="black" onClick={() => chooseColor("black")}></span>
                <br></br>
                <Button aria-label='Eraser' style={{ float: "left" }} id="white" onClick={() => chooseColor("white")}>Eraser</Button>
                <Button aria-label='Clear' style={{ float: "left" }} id="clr" onClick={() => erase()}>Clear</Button>
                <canvas ref={canvasRef} id="can" width="836" height="627" style={{ border: "2px solid", backgroundColor: "white" }}></canvas>
              </div>
              <div className={styles.chat}>
                <div style={{ overflowY: "auto", height: "95%" }}>
                  <ul style={{ margin: "0", padding: "20px" }}>
                    {
                      messages.map((message: any, index: number) => {
                        return (
                          <li key={index}>
                            {message}
                          </li>
                        )
                      })}
                  </ul>
                  <div ref={bottomRef} />
                </div>
                <form onSubmit={handleMessageSubmit}>
                  <Input aria-label='Message' style={{ width: "inherit" }} autoComplete="off" value={message} onChange={(event: React.ChangeEvent<FormElement>) => setMessage(event.target.value)} placeholder={"Message"} />
                </form>
              </div>
            </div>
          )
          :
          (
            <form onSubmit={handleNameSubmit} className={styles.userForm}>
              <Input aria-label='Name' type={"text"} value={username} onChange={(event: React.ChangeEvent<FormElement>) => setUsername(event.target.value)} placeholder={"Name"}></Input>
            </form>
          )
        }
      </main>
    </div>
  )
}

export default Home
