/**
 * ================================================================
 * 🧪 AUTO COMMENTS DEGENERATOR – Base Script v1.7
 * ------------------------------------------------
 * Purpose:
 *   Scans JS/TS source files, detects all generated comments and remove them. Reusing fns from main creator process
 *
 * Main Flow (Step Diagram):
 *   1. getAllFiles: Recursively find all source files in baseDir (excluding test/BASE folders).
 *   2. For each file:
 *      >. removeJsdocBlocks: Remove previous auto-generated JSDoc blocks.
 *
 * Author: Diego Enrique Dómine Folco
 * ================================================================
 */
//importing reading files fns
import fs from "fs";

//importing utils
import { getAllFiles } from "./utils.mjs";
import { removeJsdocBlocks } from './helpers.mjs';

/* ================================================================
CONFIGURATION
--------------------------------------------------------------- */
//importing config
import config from "./config.mjs";

const { baseDir, excludeFolders, validExtensions, flagCodeBlocks } = config;

/* ================================================================
	3️⃣ MAIN PROCESS
	--------------------------------------------------------------- */
function degenerateCommentsForAllFiles(excludeFolders) {
	if (!fs.existsSync(baseDir)) {
		console.error(`⚠️ Base directory does not exist: ${baseDir}`);
		return;
	}

	console.log(`🧭 Searching for source files to degenerate comments in:\n${baseDir}\n...`);

	const allFiles = getAllFiles(baseDir, null, validExtensions);
	let count = 0;

	for (const file of allFiles) {
		// Exclude folders
		if (excludeFolders.some(ex => file.includes(ex))) continue;
		console.log(`\n🔍 Processing file: ${file}`);

		const content = fs.readFileSync(file, "utf8");
		const cleaned = removeJsdocBlocks(content, flagCodeBlocks);

		//have been changes?
		if (content != cleaned){
			fs.writeFileSync(file, cleaned, "utf8");
			console.log(`\n✅ Updated: ${file}\n\n`);
			count++;
		}

	}

	console.log(`\n✨ ${count} files updated successfully.`);
}

/* ================================================================
	4️⃣ EXECUTION
	--------------------------------------------------------------- */
degenerateCommentsForAllFiles(excludeFolders);
/* ================================================================ */