import fs from "node:fs";
import path from "node:path";

const clientDir = path.resolve(process.cwd(), "dist/client");
const assetsDir = path.join(clientDir, "assets");

if (fs.existsSync(assetsDir)) {
  const files = fs.readdirSync(assetsDir);
  const jsFile = files.find((f) => f.startsWith("index-") && f.endsWith(".js"));
  const cssFile = files.find((f) => f.startsWith("styles-") && f.endsWith(".css"));

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CGR 02 - Sistema de Localização</title>
    <link rel="icon" href="/cadastromedicao/favicon.ico" />
    ${cssFile ? `<link rel="stylesheet" href="/cadastromedicao/assets/${cssFile}" />` : ""}
  </head>
  <body>
    <div id="root"></div>
    ${jsFile ? `<script type="module" src="/cadastromedicao/assets/${jsFile}"></script>` : ""}
  </body>
</html>
`;

  fs.writeFileSync(path.join(clientDir, "index.html"), html);
  fs.writeFileSync(path.join(clientDir, "404.html"), html);
  console.log("Successfully generated dist/client/index.html and dist/client/404.html");
}
