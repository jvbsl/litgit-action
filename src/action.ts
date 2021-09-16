import * as core from '@actions/core';
import * as exec from '@actions/exec';
import { https } from 'follow-redirects';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();


const install_litgit = async (): Promise<void> => {
    const action_path = __dirname;
    return new Promise<void>((resolve, reject) => {
        try {
            const file = fs.createWriteStream(`${action_path}/litgit.tar.gz`);

            const litgit_version = '0.2.0.36-alpha';

            const req = https.get(`https://github.com/jvbsl/LitGit/releases/download/${litgit_version}/litgit.tar.gz`, function(response) {
                response.pipe(file);
                response.on('end', async () => {
                    await exec.exec(`tar xvzf ${action_path}/litgit.tar.gz -C ${action_path}`);
                    resolve();
                });
            });

            req.on('error', (error) => {
                core.setFailed((error as Error).message);
                reject(error);
            });
            
            req.end();
        } catch(error) {
            core.setFailed((error as Error).message);
            reject(error);
        }
        
    });
}

const parseInputArray = (input:string): string[] => {
    // https://www.generacodice.com/en/articolo/4511175/split-a-string-by-commas-but-ignore-commas-within-double-quotes-using-javascript
    var arr = input.match(/(".*?"|[^" \s]+)(?=\s* |\s*$)/g);
    arr = arr || [];
    return arr;
}

const parseCommandLine = async (): Promise<string[]> => {
    let params: string[] = ['-m'];
    
    const verbose = core.getInput('verbose', { required: false });
    if (verbose.localeCompare('true', undefined, { sensitivity: 'base' }) == 0 || verbose.localeCompare('yes', undefined, { sensitivity: 'base' }) == 0) {
        params.push('-v');
    }
    
    const templates = core.getInput('templates', { required: false });
    
    if(templates !== "") {
        params.push("-t");
        params.push(...parseInputArray(templates));
    }

    const outputs = core.getInput('outputs', { required: false });
    
    if(outputs !== "") {
        params.push("-o");
        params.push(...parseInputArray(outputs));
    }
    
    const searchDir = core.getInput('search_path', { required: false });
    if (searchDir !== "") {
        //params.push("-s");
        //params.push(searchDir);
    }
        
    const destinationDir = core.getInput('destination_dir', { required: false });
    if (destinationDir !== "") {
        //params.push("-d");
        //params.push(destinationDir);
    }

    return params;
}
const testRegex = (data: string, pattern: string): Boolean =>{
    let reg = data.match(pattern);
    if (reg !== undefined && reg !== null) {
        return reg.length == 1;
    }
    return false;
}
const run = async (): Promise<void> => {
    try {
        const action_path = __dirname;

        await install_litgit();

        const params = await parseCommandLine();
        
        console.log(`LitGit Parameters: ${params}`)

        const options:exec.ExecOptions = {};
        options.silent = true;
        options.errStream = undefined;
        options.ignoreReturnCode = true;
        options.windowsVerbatimArguments = true;
        let lineIndex: number = 0;
        let paramLineCount: number = 0;
        
        let outputParams: string[] = [];
        let outputFiles: string[] = [];
        let outputLines: string[] = [];
        options.listeners = {
            errline: (_data: string) => {
                outputLines.push(_data);
                if (_data.startsWith('Error:')) {
                    return;
                }
                switch(lineIndex) {
                    case 0: {
                        if (!testRegex(_data, "^[^\ ]+ [a-f0-9]{40}$")) {
                            return;
                        }
                        console.log(`[MACHINE OUTPUT] First line: ${_data}`);
                        break;
                    }
                    case 1: {
                        if (!testRegex(_data, "^[^\ ]+ -> [0-9\.\*]+$")) {
                            return;
                        }
                        console.log(`[MACHINE OUTPUT] Second line: ${_data}`);
                        break;
                    }
                    case 2: {
                        const tmp = Number(_data);
                        if (isNaN(tmp)) {
                            return;
                        }
                        paramLineCount = tmp;
                        console.log(`[MACHINE OUTPUT] Param Line Count: ${_data} - ${paramLineCount}`);
                        break;
                    }
                    default: {
                        if (paramLineCount > 0) {
                            outputParams.push(_data);
                            --paramLineCount;
                        } else {
                            outputFiles.push(_data);
                        }
                        
                        break;
                    }
                }
                ++lineIndex;
                //console.log(_data);
            },
            stdline: (_data: string) => {
                console.log(_data);
            }
        };

        const retCode = await exec.exec(`bash ${action_path}/LitGit`, params, options);
        let err = "";
        for(let l of outputLines) {
            err+=`${l}\n`
        }
        if (retCode != 0) {
            core.setFailed(err);
        } else {
            console.log(err);
        }
        
        for(let outputParam of outputParams) {
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
    } catch(error) {
        core.setFailed((error as Error).message);
    }
}


run();