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

function compareDate(d1: date, d2: date): number {
    return compareLexicographic(d1.year - d2.year, d1.month - d2.month, d1.day - d2.day);
}

function compareTransaction(t1: transaction, t2: transaction): number {
    return compareDate(t1.date, t2.date);
}

function formatDate(d: date): string {
    return `${d.year}/${d.month}/${d.day}`;
}

function formatAmount(a: amount): string {
    return `${a.integer}.${(a.decimal + "").padStart(2, '0')}`;
}

function escapeCSV(s: string): string {
    return '"' + s.replace(/"/g, '""') + '"';
}

function formatCSVLine(t: transaction): string {
    const message = escapeCSV(t.message);
    const date = formatDate(t.date);
    const amount = formatAmount(t.amount);
    const source = escapeCSV(t.source);
    return`${message}, ${date}, ${amount}, ${source}`
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
                case "entered": return `NOMATCH entered: (${line})`;
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

export function matchTransactions({entered, actual, maxDayDiff}: {entered: transaction[], actual: transaction[], maxDayDiff?: number}): matchResult[] {
    function makeUnmatched(kind: "entered" | "actual"): (t: transaction) => unmatched {
        return t => {return { type: "unmatched", transaction: t, is: kind }};
    }
    const toProcess: unmatched[] = entered.map(makeUnmatched("entered"))
        .concat(actual.map(makeUnmatched("actual")));
    toProcess.sort(compareMatchResult);
    maxDayDiff = maxDayDiff !== undefined && maxDayDiff > 0 ? maxDayDiff : 7;

    let results: matchResult[] = [];
    let pending: unmatched[] = [];

    outer: for (let item of toProcess) {
        for (let i = 0; i < pending.length; i++) {
            const r = pending[i];

            // This transaction is older than the maxDayDiff and will never be matched, move to results
            if (dateMinus(item.transaction.date, r.transaction.date) < -maxDayDiff) {
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
                && item.transaction.source !== r.transaction.source
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

export function generateDSLSource(config: {entered: transaction[], actual: transaction[], maxDayDiff?: number}): string {
    return `    Only lines beginning with "${addPrefix}" will be in the exported file, all other lines are ignored.` + "\n\n" +
        matchTransactions(config).map(generateMatchLine).join("\n");
}
