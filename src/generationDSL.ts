import * as D from 'io-ts/lib/Decoder';
import {isLeft, isRight} from 'fp-ts/lib/Either';

const addPrefix = "ADD";

export type date = {
    readonly year: number,
    readonly month: number,
    readonly day: number,
}

export type amount = {
    readonly integer: number,
    readonly decimal: number,
}

export type transaction = {
    readonly message: string,
    readonly amount: amount,
    readonly date: date,
    readonly source: string,
}

export function parse(src: string) {
    const generated = src.split(/[\r\n]+/)
        .filter(s => s.startsWith(addPrefix))
        .map(s => s.slice(addPrefix.length).trim())
        .join("\n");
    return generated;
}

function compareLexicographic(...n: number[]): number {
    for (let i = 0; i < n.length; i++) {
        if (n[i] !== 0) return n[i];
    }
    return 0;
}

export function compareDate(d1: date, d2: date): number {
    return compareLexicographic(d1.year - d2.year, d1.month - d2.month, d1.day - d2.day);
}

export function compareTransaction(t1: transaction, t2: transaction): number {
    return compareDate(t1.date, t2.date);
}

export function formatDate(d: date): string {
    return `${d.year}/${(d.month + "").padStart(2, '0')}/${(d.day + "").padStart(2, '0')}`;
}

export function formatAmount(a: amount): string {
    return `${a.integer}.${(a.decimal + "").padStart(2, '0')}`;
}

function escapeCSV(s: string): string {
    return '"' + s.replace(/"/g, '""') + '"';
}

export function formatCSVLine(t: transaction): string {
    const message = (escapeCSV(t.message) + ",").padEnd(20, ' ');
    const date = formatDate(t.date);
    const amount = formatAmount(t.amount).padStart(15, ' ');
    const source = escapeCSV(t.source);
    return`${message} ${date}, ${amount}, ${source}`
}

export function todayDate(): date {
    const d = new Date();
    return {
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        day: d.getDate(),
    };
}

export type matched = {
    readonly type: 'matched',
    readonly actual: transaction,
    readonly entered: transaction,
}

export type unmatched = {
    readonly type: 'unmatched',
    readonly transaction: transaction,
    readonly is: 'entered' | 'actual',
}

export type transfer = {
    readonly type: 'transfer',
    readonly fromTransaction: transaction,
    readonly toSource: string,
    readonly toMessage: string,
}

export type matchResult = matched | unmatched | transfer;

function getDate(m: matchResult): date {
    return m.type === "matched" ? m.entered.date :
        m.type === "unmatched" ? m.transaction.date :
        m.type === "transfer" ? m.fromTransaction.date :
        assertUnreachable<date>(m);
}

function dateMinus(d1: date, d2: date): number {
    const d1t = new Date(d1.year, d1.month-1, d1.day).getTime();
    const d2t = new Date(d2.year, d2.month-1, d2.day).getTime();
    return Math.round((d1t - d2t) / (1000 * 60 * 60 * 24));
}

function amountEq(a1: amount, a2: amount): boolean {
    return a1.integer === a2.integer && a1.decimal === a2.decimal;
}

function amountNeg(a: amount): amount {
    return {integer: -a.integer, decimal: a.decimal};
}

function amountIsNeg(a: amount): boolean {
    return a.integer < 0;
}

function compareMatchResult(m1: matchResult, m2: matchResult): number {
    return compareDate(getDate(m1), getDate(m2));
}

function assertUnreachable<T>(_: never): T { return null as unknown as T; }

export function generateMatchLine(r: matchResult): string {
    switch (r.type) {
        case 'matched':
            let m1 = escapeCSV(r.entered.message);
            let m2 = escapeCSV(r.actual.message).padEnd(m1.length, ' ');
            m1 = m1.padEnd(m2.length, ' ');

            let d1 = formatDate(r.entered.date);
            let d2 = formatDate(r.actual.date).padStart(d1.length, ' ');
            d1 = d1.padStart(d2.length, ' ');

            let a1 = formatAmount(r.entered.amount);
            let a2 = formatAmount(r.actual.amount).padStart(a1.length, ' ');
            a1 = a1.padStart(a2.length, ' ');

            let s1 = escapeCSV(r.entered.source);
            let s2 = escapeCSV(r.actual.source).padStart(s1.length, ' ');
            s1 = s1.padStart(s2.length, ' ');

            return `    MATCHED entered: (${m1}, ${d1}, ${a1}, ${s1})` + "\n" +
                   `            actual:  (${m2}, ${d2}, ${a2}, ${s2})`;

        case 'unmatched':
            const line = formatCSVLine(r.transaction);
            switch (r.is) {
                case "entered": return `UNM ${line}`;
                case "actual":  return `${addPrefix} ${line}`;
                default: return assertUnreachable(r.is);
            }

        case 'transfer':
            const d = formatDate(r.fromTransaction.date);
            const a = formatAmount(amountNeg(r.fromTransaction.amount));
            const fs = escapeCSV(r.fromTransaction.source);
            const ts = escapeCSV(r.toSource);
            const fm = escapeCSV(r.fromTransaction.message);
            const tm = escapeCSV(r.toMessage);
            return `    TRANSFER  at:${d}  amount:${a}  from:${fs}(${fm})  to:${ts}(${tm})`;

        default:
            return assertUnreachable(r);
    }
}

export type transactionFile = {
    transactions: transaction[],
    is: "entered" | "actual",
    filename: string,
    importDate: date,
}

export function matchTransactions(sources: Record<string, transactionFile>, maxDayDiff?: number, cutoff?: date): matchResult[] {
    function makeUnmatched(kind: "entered" | "actual"): (t: transaction) => unmatched {
        return t => {return { type: "unmatched", transaction: t, is: kind }};
    }
    const toProcess: unmatched[] = Object.values(sources)
        .flatMap(({transactions, is}) => transactions.map(makeUnmatched(is)))
    toProcess.sort(compareMatchResult);
    if (cutoff) {
        const idx = toProcess.findIndex(r => compareDate(r.transaction.date, cutoff) >= 0);
        toProcess.splice(0, idx !== -1 ? idx : toProcess.length);
    }
    maxDayDiff = maxDayDiff !== undefined && maxDayDiff >= 0 ? maxDayDiff : 7;

    let results: matchResult[] = [];
    let pending: unmatched[] = [];

    outer: for (let item of toProcess) {
        for (let i = 0; i < pending.length; i++) {
            const r = pending[i];

            // This transaction is older than the maxDayDiff and will never be matched, move to results
            if (dateMinus(item.transaction.date, r.transaction.date) > maxDayDiff) {
                pending.splice(i, 1); i--;
                results.push(r);
                continue;  // we may still find something later that matches
            }

            // This transaction matches the examined one
            if (item.is !== r.is && amountEq(item.transaction.amount, r.transaction.amount)) {
                pending.splice(i, 1); i--;
                results.push({
                    type: "matched",
                    entered: (item.is === "entered" ? item : r).transaction,
                    actual: (item.is === "entered" ? r : item).transaction,
                });

                continue outer;
            }

            // This transaction looks like a transfer
            if (item.is === "actual" && r.is === "actual"
                && amountEq(amountNeg(item.transaction.amount), r.transaction.amount)) {

                pending.splice(i, 1); i--;
                const source = (amountIsNeg(item.transaction.amount) ? item : r).transaction;
                const dest = (amountIsNeg(item.transaction.amount) ? r : item).transaction;
                results.push({
                    type: "transfer",
                    fromTransaction: source,
                    toSource: dest.source,
                    toMessage: dest.message,
                });

                continue outer;
            }
        }

        // We found nothing matching, add to pending
        pending.push(item);
    }

    // We've gone through all the transactions that could match, add all pending to results
    results = results.concat(pending);

    results.sort(compareMatchResult);
    return results;
}

export function generateDSLSource(sources: Record<string, transactionFile>, maxDayDiff?: number, cutoff?: date): string {
    const results = matchTransactions(sources, maxDayDiff, cutoff);
    let count = {matched: 0, transfer: 0, actual: 0, entered: 0};
    results.forEach(r => count[r.type === 'unmatched' ? r.is : r.type] += 1);
    const text =
        `    Only lines beginning with "${addPrefix}" will be in the exported file, all other lines are ignored.
    UNM entries are those that are entered but have no actual counterpart.
    added: ${count.actual}  unmatched: ${count.entered}  matches: ${count.matched}  transfers: ${count.transfer}`
    return text + "\n\n" + results.map(generateMatchLine).join("\n");
}

const dotRemoveRegex = /[^\-.0-9]/g;
const commaRemoveRegex = /[^\-,0-9]/g;
function parseAmount(amount: string | undefined, decimalPoint: "dot" | "comma"): amount | undefined | string {
    if (amount === undefined)
        return;

    const errorMessage = `malformed number: '${amount}'`;

    const [integerPart, decimalPart, extra] = amount
        .replace(decimalPoint === "dot" ? dotRemoveRegex : commaRemoveRegex, "")
        .split(decimalPoint === "dot" ? "." : ",");
    if (extra !== undefined)
        return errorMessage;

    const integer = parseInt(integerPart, 10);
    if (isNaN(integer))
        return errorMessage;

    if (decimalPart === undefined)
        return {integer, decimal: 0} ;

    const decimal = (decimalPart.length === 1 ? 10 : 1) * parseInt(decimalPart.substring(0, 2), 10);
    if (isNaN(decimal))
        return errorMessage;

    return {integer, decimal};
}

const dateSplitRegex = /[/\- ]+/g;
function parseDate(date: string | undefined, order: string): date | undefined | string {
    if (date === undefined)
        return;

    let year: undefined | number;
    let month: undefined | number;
    let day: undefined | number;

    const split = date.split(dateSplitRegex).filter(x => x);

    for (let i = 0; i < order.length; i++) {
        switch (order.charAt(i)) {
            case 'y':
            case 'Y':
                year = parseInt(split[i], 10);
                break;
            case 'm':
            case 'M':
                month = parseInt(split[i], 10);
                break;
            case 'd':
            case 'D':
                day = parseInt(split[i], 10);
                break;
            default:
                return "Unknown character '${order.charAt(i)}' in date order description '${order}'";
        }
    }

    let missing: ("year" | "month" | "day")[] = [];
    let noParse: ("year" | "month" | "day")[] = [];
    if (year === undefined) {
        missing.push("year");
    } else if (isNaN(year)) {
        noParse.push("year");
    }
    if (month === undefined) {
        missing.push("month");
    } else if (isNaN(month)) {
        noParse.push("month");
    }
    if (day === undefined) {
        missing.push("day");
    } else if (isNaN(day)) {
        noParse.push("day");
    }

    if (missing.length || noParse.length) {
        return `Split: ${JSON.stringify(split)}, ` +
            (missing.length ? `missing: ${missing.join(", ")} ` : "") +
            (noParse ? `malformed: ${noParse.join(", ")}` : "");
    }

    return {year: year as number, month: month as number, day: day as number};
}

type parseConfig = {
    source: string,
    dropCount: number,
    amountConfig: {column: number, decimalPoint: "dot" | "comma"},
    dateConfig: {column: number, order: string},
    messageConfig: {column: number},
}
export function parseTable(table: string[][], config: parseConfig): transaction[] | string {
    const {dropCount, amountConfig, dateConfig, messageConfig, source} = config;
    if (dropCount > table.length)
        return `Cannot drop ${dropCount} rows from a table with ${table.length} rows.`

    const result = new Array<transaction>(table.length - dropCount);
    let error = "";

    for (let rowIdx = dropCount; rowIdx < table.length; rowIdx++) {
        const row = table[rowIdx];
        const amount = parseAmount(row[amountConfig.column], amountConfig.decimalPoint);
        const date = parseDate(row[dateConfig.column], dateConfig.order);
        const message = row[messageConfig.column];

        const indent = "\t";

        if (typeof amount === 'string' || amount === undefined
            || typeof date === 'string' || date === undefined
            || message === undefined) {
            error += `Row ${rowIdx+1}:\n`;

            if (amount === undefined) {
                error +=
                `${indent}Amount should be in column ${amountConfig.column}, but that column doesn't exist.\n`;
            } else if (typeof amount === 'string') {
                error +=
                `${indent}Column ${amountConfig.column}: ${amount}\n`;
            }

            if (date === undefined) {
                error +=
                `${indent}Date should be in column ${dateConfig.column}, but that column doesn't exist.\n`;
            } else if (typeof date === 'string') {
                error +=
                `${indent}Column ${dateConfig.column}: ${date}\n`;
            }

            if (message === undefined) {
                error +=
                `${indent}Message should be in column ${messageConfig.column}, but that column doesn't exist.\n`;
            }

            break;
        }

        result[rowIdx - dropCount] = {message, amount, date, source};
    }

    if (error !== "") return error
    return result;
}

const dateDecoder: D.Decoder<unknown, date> =
    D.type({
        year: D.number,
        month: D.number,
        day: D.number,
    });
const amountDecoder: D.Decoder<unknown, amount> =
    D.type({
        integer: D.number,
        decimal: D.number,
    });
const transactionDecoder: D.Decoder<unknown, transaction> =
    D.type({
        message: D.string,
        amount: amountDecoder,
        date: dateDecoder,
        source: D.string,
    });
const fileRecordDecoder: D.Decoder<unknown, Record<string, transactionFile>> =
    D.record(
        D.type({
            is: D.literal("entered", "actual"),
            filename: D.string,
            importDate: dateDecoder,
            transactions: D.array(transactionDecoder),
        })
    );

export function isFileRecord(input: unknown): input is Record<string, transactionFile> {
    const res = fileRecordDecoder.decode(input);
    if (isLeft(res))
        console.warn(D.draw(res.left));
    return isRight(res);
}
