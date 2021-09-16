import * as core from '@actions/core';
import * as exec from '@actions/exec';
import { https } from 'follow-redirects';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();


const install_litgit = async (): Promise<void> => {
    const action_path = __dirname;
    return new Promise<void>((resolve, reject) => {
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
        
    });
}

const parseCommandLine = async (): Promise<string[]> => {
    let params: string[] = ['-m'];
    
    const verbose = core.getInput('verbose', { required: false });
    if (verbose.localeCompare('true', undefined, { sensitivity: 'base' }) == 0 || verbose.localeCompare('yes', undefined, { sensitivity: 'base' }) == 0) {
        params.push('-v');
    }
    
    const templates = core.getInput('templates', { required: false });
    
    if (templates === undefined) {
        console.log(`templates: undefined`);
    } else if(templates === null) {
        console.log(`templates: null`);
    } else if(templates === "") {
        console.log(`templates not empty`);
    } else {
        console.log(`templates not asdf: ${templates}`);
    }
    
    return params;
}

const run = async (): Promise<void> => {
    
    const action_path = __dirname;

    await install_litgit();

    const params = await parseCommandLine();

    const options:exec.ExecOptions = {};
    options.silent = true;
    options.errStream = undefined;
    let lineIndex: number = 0;
    let paramLineCount: number = 0;
    
    let outputParams: string[] = [];
    let outputFiles: string[] = [];
    options.listeners = {
        errline: (_data: string) => {
            switch(lineIndex) {
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
            //console.log(data);
        }
    };

    await exec.exec(`bash ${action_path}/LitGit`, params, options);
    
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
}


run();