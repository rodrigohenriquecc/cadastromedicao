const fs = require("fs");
const path = require("path");

const kmlPath = path.join(__dirname, "..", "temp_kmz", "doc.kml");
let content = fs.readFileSync(kmlPath, "utf8");

const updatedContent = content.replace(/<width>([\d.]+)<\/width>/g, (match, p1) => {
  const originalWidth = parseFloat(p1);
  const newWidth = (originalWidth * 0.6).toFixed(2);
  // Remove trailing zeros if any (e.g. 4.50 -> 4.5, 3.00 -> 3)
  const formattedWidth = parseFloat(newWidth).toString();
  return `<width>${formattedWidth}</width>`;
});

fs.writeFileSync(kmlPath, updatedContent, "utf8");
console.log("KML line width decreased by 40%.");
