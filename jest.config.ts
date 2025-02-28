import type { Config } from 'jest';

const config: Config = {
    preset: 'ts-jest', // Se você estiver usando TypeScript
    testMatch: [
        '**/*.spec.ts' // Padrão para encontrar arquivos .jest.ts em qualquer subdiretório
    ],
    setupFilesAfterEnv: [
        './jest.setup.ts' // Arquivo de configuração do Jest
    ],
    // Outras configurações do Jest, se necessário
};

export default config;