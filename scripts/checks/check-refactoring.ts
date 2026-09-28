#!/usr/bin/env node
/**
 * Refactoring & change-management gate. Deferred work does not live in the code: a
 * `TODO` is a promise nobody is tracking, and it outlives its own deferral because
 * nothing ever re-reads it. `(TBD)` once sat in a header describing two stylesheets
 * as unwritten while both were hundreds of lines long and imported by the file the
 * note was in — that is the failure mode exactly.
 *
 * ESLint's `no-warning-comments` covers every script it can parse. This gate covers
 * the rest — the file types with no parser, and the `<template>` half of an SFC, which
 * the rule never sees because vue-eslint-parser keeps it on a separate AST. Both live
 * in @larrydarko/lint-config/gates/refactoring.
 *
 * `requireCheckboxes` is deliberately off. This repo's todo.md is prose grouped by
 * section, not a task list, and imposing `- [ ]` on it would be a formatting rule
 * pretending to be a process rule.
 */
import { checkRefactoring } from '@larrydarko/lint-config/gates/refactoring';

checkRefactoring();
