type Terminal = string
type Nonterminal = string
type Production = {
    head: Nonterminal,
    body: (Terminal | Nonterminal)[]
}
type TreeNode<TLabel> = {
    label: TLabel,
    parent: TreeNode<TLabel> | null
}
type ExpressionNode = TreeNode<{ expression: Expression, type: Terminal | Nonterminal }>
type Expression = Terminal[]

class Grammar {
    terminals!: Terminal[]
    nonterminals!: Nonterminal[]
    productions!: Production[]
    root!: Nonterminal
    productionsMap: Record<Nonterminal, Production[]> = {}

    constructor(terminals: Terminal[], nonterminals: Nonterminal[], productions: Production[], root: Nonterminal) {
        this.terminals = terminals
        this.nonterminals = nonterminals
        this.productions = productions
        this.root = root
        for (const production of productions) {
            if (!(production.head in this.productionsMap)) {
                this.productionsMap[production.head] = []
            }
            this.productionsMap[production.head].push(production)
        }
    }
}

class Parser {
    grammar!: Grammar
    map: Map<Production, Terminal[]> = new Map()

    constructor(grammar: Grammar) {
        this.grammar = grammar
        this.getFirstTerminals(grammar.root)
    }

    parse(expr: Expression) {
        return this._parse(expr).tree
    }

    private _parse(expr: Expression, nonterminal: Nonterminal = this.grammar.root, parentNode: ExpressionNode | null = null) {
        const substring: Expression = []
        const node: ExpressionNode = {label: {type: nonterminal, expression: substring}, parent: parentNode}
        const tree = [node]

        let scanningIndex = 0
        const scanningTerminal = () => expr[scanningIndex]

        let production = this.grammar.productionsMap[nonterminal].find(prod => {
            const firstTerminals = this.map.get(prod) as Terminal[]
            return firstTerminals.includes(scanningTerminal())
        })
        if (!production) {
            production = this.grammar.productionsMap[nonterminal].find(prod => {
                const firstTerminals = this.map.get(prod) as Terminal[]
                return firstTerminals.includes("")
            })
        }
        if (!production) {
            throw new Error()
        }
        production.body.forEach((element) => {
            if (this.isTerminal(element)) {
                if (!this.isEmpty(element)) {
                    if (scanningTerminal() !== element) {
                        throw new Error()
                    }
                    scanningIndex++
                }
                substring.push(element)
                tree.push({label: {type: element, expression: [element]}, parent: node})
            } else {
                const {
                    tree: childTree,
                    substring: childSubstring
                } = this._parse(expr.slice(scanningIndex), element, node)
                scanningIndex += childSubstring.filter(terminal => !this.isEmpty(terminal)).length
                substring.push(...childSubstring)
                tree.push(...childTree)
            }
        })
        return {tree, substring}
    }

    private getFirstTerminals(nonterminal: Nonterminal, visited = new Set<Nonterminal>()) {
        const {productionsMap} = this.grammar
        for (const production of productionsMap[nonterminal]) {
            const possibleSymbols = new Set<Terminal>()
            const symbol = production.body[0]
            if (this.isTerminal(symbol)) {
                possibleSymbols.add(symbol)
            } else {
                if (symbol === production.head) {
                    continue
                }
                if (!visited.has(symbol)) {
                    this.getFirstTerminals(symbol, visited)
                    visited.add(symbol)
                }
                for (const production of productionsMap[symbol]) {
                    const firstTerminals = this.map.get(production) as Terminal[]
                    firstTerminals.forEach(terminal => {
                        possibleSymbols.add(terminal)
                    })
                }
            }
            this.map.set(production, [...possibleSymbols])
        }
    }

    private isTerminal(symbol: string) {
        return this.grammar.terminals.includes(symbol) || this.isEmpty(symbol)
    }

    private isEmpty(symbol: string) {
        return symbol === ""
    }
}

const g1 = new Grammar(["a", "+", "-"], ["S"], [
    {
        head: "S",
        body: ["+", "S", "S"]
    },
    {
        head: "S",
        body: ["-", "S", "S"]
    },
    {
        head: "S",
        body: ["a"]
    }
], "S")
const p1 = new Parser(g1)

const g2 = new Grammar(["(", ")"], ["S"], [
    {
        head: "S",
        body: ["(", "S", ")"]
    },
    {
        head: "S",
        body: [""]
    },
], "S")
const p2 = new Parser(g2)
// console.log(JSON.stringify((p1.parse(["-", "a", "+", "a", "a", "u"])), null, 1))
console.log(p1.parse(["-", "a", "+", "a", "a", "u"]).map(node => node.label))
console.log(p2.parse(["(", "(", ")", ")"]).map(node => node.label))
