// Script de build para Vercel com TanStack Start
// Este script garante que o build funcione corretamente na Vercel

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🚀 Iniciando build para Vercel...');

try {
  // Verificar se o diretório dist existe, se não, criar
  if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist', { recursive: true });
  }

  // Executar o build do Vite
  console.log('📦 Executando npm run build...');
  execSync('npm run build', { stdio: 'inherit' });

  // Verificar se os arquivos foram gerados corretamente
  const clientExists = fs.existsSync('dist/client');
  const serverExists = fs.existsSync('dist/server');
  
  if (!clientExists) {
    console.error('❌ Diretório dist/client não encontrado após o build');
    process.exit(1);
  }
  
  if (!serverExists) {
    console.error('❌ Diretório dist/server não encontrado após o build');
    process.exit(1);
  }

  // Verificar se o arquivo server.js foi gerado
  const serverJsExists = fs.existsSync('dist/server/server.js');
  if (!serverJsExists) {
    console.error('❌ Arquivo dist/server/server.js não encontrado após o build');
    process.exit(1);
  }

  console.log('✅ Build concluído com sucesso!');
  console.log('📁 Estrutura gerada:');
  console.log('  dist/client/ - Arquivos estáticos do cliente');
  console.log('  dist/server/ - Código do servidor SSR');
  console.log('  dist/server/server.js - Ponto de entrada do servidor');

} catch (error) {
  console.error('❌ Erro durante o build:', error.message);
  process.exit(1);
}