export class JsonObjectScanner {
  private current = "";
  private depth = 0;
  private inString = false;
  private escaped = false;

  push(text: string): string[] {
    const complete: string[] = [];
    for (const char of text) {
      if (this.depth === 0) {
        if (char === "{") this.open();
        continue;
      }
      this.current += char;
      if (this.inString) this.readStringChar(char);
      else if (this.closesObject(char)) complete.push(this.take());
    }
    return complete;
  }

  private open(): void {
    this.current = "{";
    this.depth = 1;
  }

  private readStringChar(char: string): void {
    if (this.escaped) this.escaped = false;
    else if (char === "\\") this.escaped = true;
    else if (char === '"') this.inString = false;
  }

  private closesObject(char: string): boolean {
    if (char === '"') this.inString = true;
    else if (char === "{" || char === "[") this.depth++;
    else if (char === "}" || char === "]") this.depth--;
    return this.depth === 0;
  }

  private take(): string {
    const object = this.current;
    this.current = "";
    return object;
  }
}
