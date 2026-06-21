import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { networkInterfaces } from "node:os";

const root = new URL("../preview/", import.meta.url);
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "0.0.0.0";

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml"
};

function getLanUrls() {
  const urls = [];
  for (const [name, addresses] of Object.entries(networkInterfaces())) {
    if (/vpn|nord|openvpn|virtual|docker|wsl|vmware|hyper-v/i.test(name)) {
      continue;
    }
    for (const address of addresses || []) {
      if (address.family === "IPv4" && !address.internal) {
        urls.push(`http://${address.address}:${port}`);
      }
    }
  }
  return urls;
}

createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://localhost:${port}`);
  const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
  const fileUrl = new URL(pathname.replace(/^\/+/, ""), root);

  try {
    const body = await readFile(fileUrl);
    res.writeHead(200, { "Content-Type": mime[extname(fileUrl.pathname)] || "application/octet-stream" });
    res.end(body);
  } catch {
    const fallback = await readFile(new URL("index.html", root));
    res.writeHead(200, { "Content-Type": mime[".html"] });
    res.end(fallback);
  }
}).listen(port, host, () => {
  console.log("");
  console.log("Visualize web preview pronta.");
  console.log(`Sul PC: http://localhost:${port}`);
  for (const url of getLanUrls()) {
    console.log(`Su iPhone/iPad nella stessa Wi-Fi: ${url}`);
  }
  console.log("");
  console.log("Se iPhone/iPad non apre l'indirizzo, consenti Node.js nel firewall di Windows per reti private.");
});
