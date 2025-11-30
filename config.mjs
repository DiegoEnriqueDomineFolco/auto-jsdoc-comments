// scripts/config.js

/* ================================================================
 CONFIGURATION
	--------------------------------------------------------------- */
import path from "path";

//basic path string; can be a directory or a single file
const whereToLook = "./somewhere/somefile.js";

export default {
  baseDir: path.resolve(whereToLook),
  
  //array of folders names to ignore
  excludeFolders: ["__tests__", "BASE__tests__", "node_modules", ".next", "tailwind.config.js"], 
  
  //array of valid extensions to process
  //actual decoding algorithms only support .js deeply and basic .ts support
  validExtensions: [".js"],
  
  //dryRun = false to actually write changes; dryRun = true to only simulate and show diff in logs
  //(only for comment generation processes)
  dryRun: false,
  
  //flag string to identify generated code blocks & file header block
  //used to detect and remove previously generated comments; generation & degeneration processes
  //IMPORTANT: keep this string in sync with the one used in generate-comments-jsdoc.mjs, otherwise if there are
  ////blocks generated with a different flag they will not be detected for removal or re-running the generator!!!
  flagCodeBlocks: "Automated Testing Block - Do Not Change",
  
  // Add other configuration options as needed
};