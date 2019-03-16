export interface Group {
    index: number;
    startAngle: number;
    endAngle: number;
    value: number;
    id: string;
    name: string;
    level: number;
}

export interface Link {
    source: Group & { subindex: number },
    target: Group & { subindex: number }
}