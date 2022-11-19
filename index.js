const express = require('express');
const cors = require('cors');
const ytdl = require('ytdl-core');
const app = express();
const cp = require('child_process');
const ffmpeg = require('ffmpeg-static');
const request = require('request');
var http = require('http');
const fs = require('fs')
const readline = require('readline')
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
    })
    let audio = ytdl(url, {
        filter: 'audioonly',
        highWaterMark: 1 << 25,
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



app.get('/createVid', async (req, res) => {
    var ref = req.query.url;


    const tracker = {
        start: Date.now(),
        audio: {
            downloaded: 0,
            total: Infinity
        },
        video: {
            downloaded: 0,
            total: Infinity
        },
        merged: {
            frame: 0,
            speed: '0x',
            fps: 0
        },
    };

    // Get audio and video streams
    const audio = ytdl(ref, {
            quality: 'highestaudio'
        })
        .on('progress', (_, downloaded, total) => {
            tracker.audio = {
                downloaded,
                total
            };
        });
    const video = ytdl(ref, {
            quality: 'highestvideo'
        })
        .on('progress', (_, downloaded, total) => {
            tracker.video = {
                downloaded,
                total
            };
        });

    // Prepare the progress bar
    let progressbarHandle = null;
    const progressbarInterval = 1000;
    const showProgress = () => {
        readline.cursorTo(process.stdout, 0);
        const toMB = i => (i / 1024 / 1024).toFixed(2);

        process.stdout.write(`Audio  | ${(tracker.audio.downloaded / tracker.audio.total * 100).toFixed(2)}% processed `);
        process.stdout.write(`(${toMB(tracker.audio.downloaded)}MB of ${toMB(tracker.audio.total)}MB).${' '.repeat(10)}\n`);

        process.stdout.write(`Video  | ${(tracker.video.downloaded / tracker.video.total * 100).toFixed(2)}% processed `);
        process.stdout.write(`(${toMB(tracker.video.downloaded)}MB of ${toMB(tracker.video.total)}MB).${' '.repeat(10)}\n`);

        process.stdout.write(`Merged | processing frame ${tracker.merged.frame} `);
        process.stdout.write(`(at ${tracker.merged.fps} fps => ${tracker.merged.speed}).${' '.repeat(10)}\n`);

        process.stdout.write(`running for: ${((Date.now() - tracker.start) / 1000 / 60).toFixed(2)} Minutes.`);
        readline.moveCursor(process.stdout, 0, -3);
    };

    // Start the ffmpeg child process
    const ffmpegProcess = cp.spawn(ffmpeg, [
        // Remove ffmpeg's console spamming
        '-loglevel', '8', '-hide_banner',
        // Redirect/Enable progress messages
        '-progress', 'pipe:3',
        // Set inputs
        '-i', 'pipe:4',
        '-i', 'pipe:5',
        // Map audio & video from streams
        '-map', '0:a',
        '-map', '1:v',
        // Keep encoding
        '-c:v', 'copy',
        //replace
        '-y',
        // Define output file
        'out.mp4',
    ], {
        windowsHide: true,
        stdio: [
            /* Standard: stdin, stdout, stderr */
            'inherit', 'inherit', 'inherit',
            /* Custom: pipe:3, pipe:4, pipe:5 */
            'pipe', 'pipe', 'pipe',
        ],
    });
    ffmpegProcess.on('close', () => {
        console.log('done');
        // Cleanup
        process.stdout.write('\n\n\n\n');
        clearInterval(progressbarHandle);
    });

    // Link streams
    // FFmpeg creates the transformer streams and we just have to insert / read data
    ffmpegProcess.stdio[3].on('data', chunk => {
        // Start the progress bar
        if (!progressbarHandle) progressbarHandle = setInterval(showProgress, progressbarInterval);
        // Parse the param=value list returned by ffmpeg
        const lines = chunk.toString().trim().split('\n');
        const args = {};
        for (const l of lines) {
            const [key, value] = l.split('=');
            args[key.trim()] = value.trim();
        }
        tracker.merged = args;
    });
    audio.pipe(ffmpegProcess.stdio[4]);
    video.pipe(ffmpegProcess.stdio[5]);


});

app.get('/createVid2', async (req, res) => {
    try {
        if (fs.existsSync('out.mp4')) {
            await fs.unlinkSync('out.mp4');
        }
    } catch (error) {
        console.log("eee", error);
    }
    var url = req.query.url;
    const writable = fs.createWriteStream(__dirname + "/out.mp4", {
        autoClose: true
    });

    res.header("Content-Disposition", `attachment;  filename=video.mp4`)
    let video = ytdl(url, {
        filter: 'videoonly'
    })
    let audio = ytdl(url, {
        filter: 'audioonly',
        highWaterMark: 1 << 25
    });
    const ffmpegProcess = cp.spawn(ffmpeg, [
        // '-',
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
        //replace
        // '-y',
        // Define output file
        '-'
    ], {
        stdio: [
            'pipe', 'pipe', 'pipe', 'pipe', 'pipe',
        ],
    });


    video.pipe(ffmpegProcess.stdio[3]);
    audio.pipe(ffmpegProcess.stdio[4]);
    // ffmpegProcess.stdio[1].pipe(res);


    ffmpegProcess.stdio[1].pipe(writable);

    // setInterval(()=>{
    //   console.log("c",fs.statSync("out.mp4").size);
    //  },1000)

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
    ffmpegProcess.on('close', () => {
        console.log('donessssssssssssssssssssssssssssssssssssss');
        // Cleanup
        // writable.end()

    });
    ffmpegProcess.stdio[1].pipe(res);
    // res.send({stt:"ok"});
});

app.get("/view2T", function (req, res) {
    // Ensure there is a range given for the video
    const range = req.headers.range;
    if (!range) {
        res.status(400).send("Requires Range header");
    }
    const videoPath = "out.mp4";

    // setInterval(() => {
    //     console.log("c", fs.statSync("out.mp4").size);
    // }, 5000)
    const videoSize = fs.statSync("out.mp4").size;

    // Parse Range
    // Example: "bytes=32324-"
    const CHUNK_SIZE = 10 ** 6; // 1MB
    const start = Number(range.replace(/\D/g, ""));
    // const end = Math.min(start + CHUNK_SIZE, videoSize - 1);
    const end = Math.min(start + CHUNK_SIZE, videoSize - 1);
    // console.log("end", start, end, videoSize);
    // Create headers
    const contentLength = end - start + 1;
    const headers = {
        "Content-Range": `bytes ${start}-${end}/${videoSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": contentLength,
        "Content-Type": "video/mp4",
    };

    // HTTP Status 206 for Partial Content
    res.writeHead(206, headers);

    // create video read stream for this particular chunk
    const videoStream = fs.createReadStream(videoPath, {
        start,
        end,
        autoClose: true
    });

    // Stream the video chunk to the client
    videoStream.pipe(res);

});


app.get("/view2", function (req, res) {
    const videoPath = `out.mp4`;
    const videoStat = fs.statSync(videoPath);
    const fileSize = videoStat.size;
    const videoRange = req.headers.range;
    if (videoRange) {
        const parts = videoRange.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1]
            ? parseInt(parts[1], 10)
            : fileSize-1;
        const chunksize = (end-start) + 1;
        const file = fs.createReadStream(videoPath, {start, end,autoClose:true});
        const head = {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': 'video/mp4',
        };
        res.writeHead(206, head);
        file.pipe(res);
    } else {
        const head = {
            'Content-Length': fileSize,
            'Content-Type': 'video/mp4',
        };
        res.writeHead(200, head);
        fs.createReadStream(videoPath).pipe(res);
    }

});