// index.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import fs from 'node:fs/promises';
import path from 'path';
import { pipeline } from "stream";
import { promisify } from "util";
const pump = promisify(pipeline);

interface CustomRequest extends Request {
  rawBody: string;
  setEncoding: (encoding: string) => void;
  on: (event: string, listener: Function) => this;
}

// LƯU Ý: KHÔNG dùng express.json() vì sẽ parse body thành object, ta cần raw text
const app = express();

// Cho phép CORS (mở cho dev; cân nhắc hạn chế origin khi lên prod)
app.use(cors({
  origin: "*",
  methods: ["POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false,
  maxAge: 86400,
}));

// Middleware đọc raw body text với content-type text/plain
app.use((req: CustomRequest, res: any, next: any) => {
  if (req.method === "OPTIONS") return res.sendStatus(204);
  let data = "";
  req.setEncoding("utf8");
  req.on("data", chunk => data += chunk);
  req.on("end", () => {
    req.rawBody = data; // lưu lại chuỗi raw
    next();
  });
});

const GOOGLE_BEARER = process.env.GOOGLE_BEARER;
if (!GOOGLE_BEARER) {
  console.error("Missing GOOGLE_BEARER env");
  process.exit(1);
}

app.post("/api/aisandbox/batchAsyncGenerateVideoText", async (req: CustomRequest, res: any) => {
  try {
    // body phải là 1 chuỗi JSON duy nhất; nếu FE gửi object thì stringify, nếu đã là string thì giữ nguyên
    const body = typeof req.rawBody === "string" && req.rawBody.trim().length
      ? req.rawBody
      : JSON.stringify(req.body || {});

    // Header tối thiểu cần thiết để tái hiện curl; có thể thêm accept-language/user-agent nếu muốn
    const headers = {
      "accept": "*/*",
      "authorization": `Bearer ${GOOGLE_BEARER}`,
      "content-type": "text/plain;charset=UTF-8",
    };

    const upstream = await fetch("https://aisandbox-pa.googleapis.com/v1/video:batchAsyncGenerateVideoText", {
      method: "POST",
      headers,
      body, // GỬI NGUYÊN CHUỖI, KHÔNG stringify LẦN 2
    });

    const text = await upstream.text();
    // chuyển tiếp status và content-type
    res.status(upstream.status);
    res.setHeader("content-type", upstream.headers.get("content-type") || "application/json; charset=utf-8");
    return res.send(text);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: String(e.message || e) });
  }
});

app.post("/api/aisandbox/batchAsyncGenerateVideoStartImage", async (req: CustomRequest, res: any) => {
  try {
    // body phải là 1 chuỗi JSON duy nhất; nếu FE gửi object thì stringify, nếu đã là string thì giữ nguyên
    const body = typeof req.rawBody === "string" && req.rawBody.trim().length
      ? req.rawBody
      : JSON.stringify(req.body || {});

    // Header tối thiểu cần thiết để tái hiện curl; có thể thêm accept-language/user-agent nếu muốn
    const headers = {
      "accept": "*/*",
      "authorization": `Bearer ${GOOGLE_BEARER}`,
      "content-type": "text/plain;charset=UTF-8",
    };

    const upstream = await fetch("https://aisandbox-pa.googleapis.com/v1/video:batchAsyncGenerateVideoStartImage", {
      method: "POST",
      headers,
      body, // GỬI NGUYÊN CHUỖI, KHÔNG stringify LẦN 2
    });

    const text = await upstream.text();
    // chuyển tiếp status và content-type
    res.status(upstream.status);
    res.setHeader("content-type", upstream.headers.get("content-type") || "application/json; charset=utf-8");
    return res.send(text);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: String(e.message || e) });
  }
});

// server.js (bổ sung sau route gửi prompt)
app.post("/api/aisandbox/batchCheckAsyncVideoGenerationStatus", async (req: CustomRequest, res: any) => {
  try {
    // Nhận raw text (đã có middleware raw body ở trên)
    const body = typeof req.rawBody === "string" && req.rawBody.trim().length
      ? req.rawBody
      : JSON.stringify(req.body || {});

    const headers = {
      "accept": "*/*",
      "authorization": `Bearer ${GOOGLE_BEARER}`,
      "content-type": "text/plain;charset=UTF-8",
    };

    const upstream = await fetch("https://aisandbox-pa.googleapis.com/v1/video:batchCheckAsyncVideoGenerationStatus", {
      method: "POST",
      headers,
      body, // GỬI CHUỖI JSON, KHÔNG stringify lần 2
    });

    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader("content-type", upstream.headers.get("content-type") || "application/json; charset=utf-8");
    return res.send(text);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: String(e.message || e) });
  }
});

app.post("/api/aisandbox/uploadUserImage", async (req: CustomRequest, res: any) => {
  try {
    // Nhận raw text (đã có middleware raw body ở trên)
    const body = typeof req.rawBody === "string" && req.rawBody.trim().length
      ? req.rawBody
      : JSON.stringify(req.body || {});

    const headers = {
      "accept": "*/*",
      "authorization": `Bearer ${GOOGLE_BEARER}`,
      "content-type": "text/plain;charset=UTF-8",
    };

    const upstream = await fetch("https://aisandbox-pa.googleapis.com/v1:uploadUserImage", {
      method: "POST",
      headers,
      body, // GỬI CHUỖI JSON, KHÔNG stringify lần 2
    });

    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader("content-type", upstream.headers.get("content-type") || "application/json; charset=utf-8");
    return res.send(text);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: String(e.message || e) });
  }
});

app.get('/image', async (req, res) => {
  const absolutePath = req.query.path as string; // Lấy đường dẫn từ tham số truy vấn

  if (!absolutePath) {
    return res.status(400).send('Thiếu tham số đường dẫn ảnh.');
  }

  // Đảm bảo đường dẫn hợp lệ và nằm trong thư mục cho phép
  // Tùy chỉnh việc kiểm tra này để phù hợp với ứng dụng của bạn
  try {
    const data = await fs.readFile(absolutePath);
    const fileExtension = path.extname(absolutePath).toLowerCase();
    let mediaType;

    switch (fileExtension) {
      case '.jpg':
      case '.jpeg':
        mediaType = 'image/jpeg';
        break;
      case '.png':
        mediaType = 'image/png';
        break;
      // Thêm các loại file ảnh khác nếu cần
      default:
        return res.status(400).send('Định dạng file không được hỗ trợ.');
    }

    res.contentType(mediaType); // Thiết lập tiêu đề Content-Type
    res.send(data); // Gửi dữ liệu ảnh dạng Buffer
  } catch (err) {
    console.error('Lỗi khi đọc file ảnh:', err);
    res.status(404).send('Không tìm thấy ảnh.');
  }
});

app.post("/api/proxy/download", async (req: CustomRequest, res: any) => {
  try {
    let rawBody = JSON.parse(req.rawBody);
    const url = rawBody.url;
    const filename = rawBody.filename;
    if (!url) return res.status(400).json({ error: "missing url" });

    let target;
    try {
      target = new URL(url);
    } catch {
      return res.status(400).json({ error: "invalid url" });
    }

    // if (!ALLOWED_HOSTS.has(target.hostname)) {
    //   return res.status(400).json({ error: "host not allowed" });
    // }

    const upstream = await fetch(target, { method: "GET" });
    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text().catch(() => "");
      return res.status(502).json({ error: `upstream ${upstream.status}`, detail: text.slice(0, 300) });
    }

    // Header gợi ý tên file
    const basename = filename || target.pathname.split("/").filter(Boolean).pop() || "download.bin";
    res.setHeader("Content-Disposition", `attachment; filename="${basename}"`);

    // Pass-through các header quan trọng
    const ct = upstream.headers.get("content-type");
    if (ct) res.setHeader("Content-Type", ct);
    const cl = upstream.headers.get("content-length");
    if (cl) res.setHeader("Content-Length", cl);
    const ar = upstream.headers.get("accept-ranges");
    if (ar) res.setHeader("Accept-Ranges", ar);

    // Cho phép FE gọi từ origin của bạn
    res.setHeader("Access-Control-Allow-Origin", "*");

    await pump(upstream.body, res);
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Proxy running on http://localhost:${PORT}`);
});
