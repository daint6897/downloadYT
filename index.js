const express = require('express');
const cors = require('cors');
const ytdl = require('ytdl-core');
const app = express();
const cp = require('child_process');
const ffmpeg = require('ffmpeg-static');
const fs = require('fs')
const readline =require('readline')
app.use(express.static(__dirname + "\\static"));
app.use('/static', express.static('./static'));

app.listen(3000, () => {
    console.log("It Works!");
});

app.get('/', (req, res) => {
    res.sendFile('index.html', {
        root: './'
    });
})

app.get('/download', async (req, res) => {
    var url = req.query.url;


    res.header("Content-Disposition", `attachment;  filename=video.mp4`)
    let video = ytdl(url, {
        filter: 'videoonly'
    })
    let audio = ytdl(url, {
        filter: 'audioonly',
        highWaterMark: 1 << 25
    });
    const ffmpegProcess = cp.spawn(ffmpeg, [
        '-i', `pipe:3`,
        '-i', `pipe:4`,
        '-map', '0:v',
        '-map', '1:a',
        '-c:v', 'copy',
        '-c:a', 'libmp3lame',
        '-crf', '27',
        '-preset', 'veryfast',
        '-movflags', 'frag_keyframe+empty_moov',
        '-f', 'mp4',
        '-loglevel', 'error',
        '-'
    ], {
        stdio: [
            'pipe', 'pipe', 'pipe', 'pipe', 'pipe',
        ],
    });

    video.pipe(ffmpegProcess.stdio[3]);
    audio.pipe(ffmpegProcess.stdio[4]);
    ffmpegProcess.stdio[1].pipe(res);

    let ffmpegLogs = ''

    ffmpegProcess.stdio[2].on(
        'data',
        (chunk) => {
            ffmpegLogs += chunk.toString()
        }
    )

    ffmpegProcess.on(
        'exit',
        (exitCode) => {
            if (exitCode === 1) {
                console.error(ffmpegLogs)
            }
        }
    )
});


app.get('/view', async (req, res) => {
    var url = req.query.url;


    let video = ytdl(url, {
        filter: 'videoonly',
        seek: 1000,
    })
    let audio = ytdl(url, {
        filter: 'audioonly',
        highWaterMark: 1 << 25,
        seek: 1000,
    });
    // const header = {

    //     'Content-Range': `bytes ${start}-${end}/${fileSize}`,

    //     'Accept-Ranges': 'bytes',

    //     'Content-Length': chunksize,

    //     'Content-Type': 'video/mp4',
    //     'filename':'video.mp4'

    //     };
        res.writeHead(200, {
            Connection: "keep-alive",
            // "Content-Type": "audio/mpeg",
        });
        // res.writeHead(206, head);

        // let info = await ytdl.getInfo(url);
        // console.log("info",info)
    // res.header("Content-Disposition", `attachment;  filename=video.mp4`)
    const ffmpegProcess = cp.spawn(ffmpeg, [
        '-i', `pipe:3`,
        '-i', `pipe:4`,
        '-map', '0:v',
        '-map', '1:a',
        '-c:v', 'copy',
        '-c:a', 'libmp3lame',
        '-crf', '27',
        '-preset', 'veryfast',
        '-movflags', 'frag_keyframe+empty_moov',
        '-f', 'mp4',
        '-loglevel', 'error',
        '-'
    ], {
        stdio: [
            'pipe', 'pipe', 'pipe', 'pipe', 'pipe',
        ],
    });

    video.pipe(ffmpegProcess.stdio[3]);
    audio.pipe(ffmpegProcess.stdio[4]);
    ffmpegProcess.stdio[1].pipe(res);

    let ffmpegLogs = ''

    ffmpegProcess.stdio[2].on(
        'data',
        (chunk) => {
            ffmpegLogs += chunk.toString()
        }
    )

    ffmpegProcess.on(
        'exit',
        (exitCode) => {
            if (exitCode === 1) {
                console.error(ffmpegLogs)
            }
        }
    )

  });