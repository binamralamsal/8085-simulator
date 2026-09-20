import tailwind from "bun-plugin-tailwind";
const result = await Bun.build({
  entrypoints: ["./index.html"],
  outdir: "./public",
  minify: true,
  plugins: [tailwind],
});
if (!result.success) {
  console.error(result.logs);
  process.exit(1);
}
const standalone = await Bun.build({
  entrypoints: ["./index.html"],
  outdir: "./dist-standalone",
  minify: true,
  compile: true,
  target: "browser",
  plugins: [tailwind],
});
if (!standalone.success) {
  console.error(standalone.logs);
  process.exit(1);
}
console.log(
  `Built ${result.outputs.length} static assets to dist/ and a self-contained dist-standalone/index.html.`,
);
