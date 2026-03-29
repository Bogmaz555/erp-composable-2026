const fs = require('fs');
const path = require('path');

const appsDir = path.join(__dirname, 'apps');
const modules = fs.readdirSync(appsDir).filter(m => m !== 'frontend' && m !== 'api-gateway');

for (const mod of modules) {
  const handlerFile = path.join(appsDir, mod, 'src', `${mod}.handler.ts`);
  if (!fs.existsSync(handlerFile)) continue;

  let content = fs.readFileSync(handlerFile, 'utf8');

  // Fix imports
  if (!content.includes('AggregateRoot')) {
    content = content.replace(
      /import \{ CommandHandler, ICommandHandler, EventPublisher \} from '@nestjs\/cqrs';/,
      "import { CommandHandler, ICommandHandler, EventPublisher, AggregateRoot } from '@nestjs/cqrs';"
    );
  }

  // Fix class definition
  content = content.replace(
    /export class (\w+)Aggregate \{([\s\S]*?)constructor\(private readonly id: string\) \{\}([\s\S]*?)create\(payload: any\) \{([\s\S]*?)return new (\w+CreatedEvent)\(this\.id, payload\);([\s\S]*?)\}/,
    `export class $1Aggregate extends AggregateRoot {
  constructor(private readonly aggregateId: string) {
    super();
  }
  create(payload: any) {$4const event = new $5(this.aggregateId, payload);
    this.apply(event);
    return event;
  }`
  );

  fs.writeFileSync(handlerFile, content);
  console.log(`[FIXED] ${handlerFile}`);
}
