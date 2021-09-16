"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const exec = __importStar(require("@actions/exec"));
const follow_redirects_1 = require("follow-redirects");
const fs = __importStar(require("fs"));
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const install_litgit = async () => {
    const action_path = __dirname;
    return new Promise((resolve, reject) => {
        try {
            const file = fs.createWriteStream(`${action_path}/litgit.tar.gz`);
            const litgit_version = '0.2.0.36-alpha';
            const req = follow_redirects_1.https.get(`https://github.com/jvbsl/LitGit/releases/download/${litgit_version}/litgit.tar.gz`, function (response) {
                response.pipe(file);
                response.on('end', async () => {
                    await exec.exec(`tar xvzf ${action_path}/litgit.tar.gz -C ${action_path}`);
                    resolve();
                });
            });
            req.on('error', (error) => {
                core.setFailed(error.message);
                reject(error);
            });
            req.end();
        }
        catch (error) {
            core.setFailed(error.message);
            reject(error);
        }
    });
};
const parseCommandLine = async () => {
    let params = ['-m'];
    const verbose = core.getInput('verbose', { required: false });
    if (verbose.localeCompare('true', undefined, { sensitivity: 'base' }) == 0 || verbose.localeCompare('yes', undefined, { sensitivity: 'base' }) == 0) {
        params.push('-v');
    }
    const templates = core.getInput('templates', { required: false });
    if (templates !== "") {
        params.push(`-t ${templates}`);
    }
    const outputs = core.getInput('outputs', { required: false });
    if (outputs !== "") {
        params.push(`-o ${outputs}`);
    }
    const searchDir = core.getInput('search_path', { required: false });
    if (searchDir !== "") {
        params.push(`-s ${searchDir}`);
    }
    const destinationDir = core.getInput('destination_dir', { required: false });
    if (destinationDir !== "") {
        params.push(`-d ${destinationDir}`);
    }
    return params;
};
const run = async () => {
    const action_path = __dirname;
    await install_litgit();
    const params = await parseCommandLine();
    console.log(`LitGit Parameters: ${params}`);
    const options = {};
    options.silent = true;
    options.errStream = undefined;
    let lineIndex = 0;
    let paramLineCount = 0;
    let outputParams = [];
    let outputFiles = [];
    options.listeners = {
        errline: (_data) => {
            switch (lineIndex) {
                case 0: {
                    break;
                }
                case 1: {
                    break;
                }
                case 2: {
                    paramLineCount = Number(_data);
                    break;
                }
                default: {
                    if (paramLineCount > 0) {
                        outputParams.push(_data);
                        --paramLineCount;
                    }
                    else {
                        outputFiles.push(_data);
                    }
                    break;
                }
            }
            ++lineIndex;
        },
        stdline: (_data) => {
        }
    };
    await exec.exec(`bash ${action_path}/LitGit`, params, options);
    for (let outputParam of outputParams) {
        const ind = outputParam.indexOf('=');
        if (ind == -1) {
            continue;
        }
        const outputParamName = outputParam.substring(0, ind);
        const outputParamValue = outputParam.substring(ind + 1);
        console.log(`Setting ${outputParamName} to ${outputParamValue}`);
        core.setOutput(outputParamName, outputParamValue);
    }
    core.setOutput("CREATED_TEMPLATE_FILES", outputFiles);
};
run();
