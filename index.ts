// OK Bruter by M8
// Based on OK Bruter by Nikita Volkov (dvadvaa, volkovcute)

import axios, { AxiosResponse } from "axios";
import { WriteStream, createWriteStream, exists } from "fs";
import { Agent } from "http";
import { existsSync } from "fs";
import { unlinkSync } from "fs";
import prompts from "prompts";
require("dotenv").config({ path: __dirname + "/.env" });

const apiUrl: string = `https://wmf.ok.ru/track;js
essionid=${process.env.SID}?id=`;
// Init the agent for requests
const httpAgent: Agent = new Agent({ keepAlive: true, maxSockets: 20 });

// Constant variable with id to stop the program
let finishId: number = 128282525254911;

// Init the interface for returned result for function getTrackInfo
interface ITrackInfo {
  id: number;
  data: string;
}

// Some check for existing of the file
let fileName: string = "OK_Results.txt";

existsSync(fileName) ? unlinkSync(fileName) : null;

const fileStream: WriteStream = createWriteStream(fileName, { flags: "a" });

let sessionId: string = "";

const getTrackInfo = async (trackId: number): Promise<ITrackInfo> => {
  try {
    // Parsing from API
    const response: AxiosResponse = await axios.get(`${apiUrl}${trackId}`, {
      httpAgent: httpAgent,
    });
    const data = response.data;

    // Check for errors
    if (JSON.stringify(data).includes("error")) {
      console.log("Ошибка при получении информации о треке.");
      return { id: trackId, data: `Ошибка: ${trackId}\n` };
    } else {
      // If success
      const { track }: any = data;
      const output: string = `${track.id}|${track.playRestricted ?? ""}|${
        track.releaseId ?? "none"
      }|${track.ensemble} - ${track.name} | Длительность = ${
        track.duration
      } с.`;
      if (output.includes("|true|none|")) {
        console.log(output + " (Анрелиз)\n\n");
        return { id: trackId, data: output + " (Анрелиз)\n" };
      } else {
        return { id: -1, data: "" };
      }
    }
  } catch (error) {
    console.error(error);
    return { id: trackId, data: `Фатальная ошибка: ${trackId}\n` };
  }
};

// Write data to the file
const writeResults = (results: ITrackInfo[]): void => {
  results
    .sort((a: ITrackInfo, b: ITrackInfo) => a.id - b.id)
    .forEach(({ data }) => {
      fileStream.writable
        ? fileStream.write(data, "utf-8", (err) =>
            err ? console.error(err) : null
          )
        : null;
    });
};

const startBrute = async () => {
  const idPrompt = await prompts({
    type: "number",
    name: "id",
    message:
      "Введите ID невышедшего трека (обязательно его позиция должна быть первой в чанке)\nДля того, чтобы найти трек с первой позицией, запустите скрипт с любым айди Вашего трека, затем дождитесь, пока программа начнёт выдавать ошибки.\nПоследний трек, перед которым начинаются ошибки, находится на позиции 256, возьмите его айди и прибавьте к нему 3841.\nЗатем перезапустите программу и вставьте это значение\n\nАйди: ",
  });
  let id: number = idPrompt.id;

  let chunkPosition: number = 0;
  let results: ITrackInfo[] = [];

  for (id; id < finishId; chunkPosition === 256 ? (id += 3841) : (id += 4097)) {
    switch (chunkPosition) {
      case 256:
        chunkPosition = 1;
        console.log("Новый чанк!");
        results.push({ id: id, data: "\nНовый чанк.\n" });
        break;
      default:
        chunkPosition++;
    }
    console.log(`Получаем информацию о треке с айди ${id} :3`);
    results.push(await getTrackInfo(id));
    if (results.length >= 20) {
      writeResults(results);
      results = [];
    }
  }
  writeResults(results);
  fileStream.end();
};

startBrute();
