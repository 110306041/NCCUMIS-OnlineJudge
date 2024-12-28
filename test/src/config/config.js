export const languageConfigs = {
    javascript: {
        // memoryLimit: '512m',
        memoryLimit: 512,
        cpuLimit: 0.5,
        timeout: 10000,
        image: 'node:lts-alpine',
        fileExtension: '.js',
        runCommand: ['node']
    },
    python: {
        // memoryLimit: '256m',
        memoryLimit: 256,
        cpuLimit: 0.3,
        timeout: 8000,
        image: 'python:3.13.1-alpine',
        fileExtension: '.py',
        runCommand: ['python']
    },
    java: {
        // memoryLimit: '1g',
        memoryLimit: 1000,
        cpuLimit: 1.0,
        timeout: 15000,
        image: 'amazoncorretto:21',
        fileExtension: '.java',
        compileCommand: ['javac'],
        runCommand: ['java']
    }
};

export const workerConfig = {
    maxRunners: 4,
    maxQueueSize: 100,
    pollInterval: 100
};

export const systemConfig = {
    workDir: './temp',
    containerDefaults: {
        networkMode: 'none',
        autoRemove: true,
        privileged: false,
        securityOpt: ['no-new-privileges']
    }
};

export default {
    languages: languageConfigs,
    worker: workerConfig,
    system: systemConfig
};