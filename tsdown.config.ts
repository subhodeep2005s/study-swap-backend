import { defineConfig } from "tsdown";

export default defineConfig({
	entry: ["src/server.ts"],
	format: ["esm"],
	dts: false,
	sourcemap: true,
	clean: true,
	treeshake: true,
	minify: true,
	target: "es2022",
	outDir: "dist",
	tsconfig: "./tsconfig.json",
});

