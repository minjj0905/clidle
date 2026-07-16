#!/usr/bin/env node
import { render } from 'ink';
import { App } from './App.js';
import { loadWords } from './words.js';

const words = loadWords();
render(<App words={words} />);
