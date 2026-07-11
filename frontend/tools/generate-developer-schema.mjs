import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const frontendRoot = process.cwd();
const schemaPath = resolve(frontendRoot, '../backend/prisma/schema.prisma');
const outputPath = resolve(frontendRoot, 'src/app/features/developer/schema/developer-schema.generated.ts');

const schema = readFileSync(schemaPath, 'utf8');
const tables = buildDeveloperSchemasFromPrismaSchema(schema);

const output = `import type { DeveloperSchemaTable } from './prisma-schema-parser';

export const DEVELOPER_TABLE_SCHEMAS: DeveloperSchemaTable[] = ${JSON.stringify(tables, null, 2)};
`;

writeFileSync(outputPath, output, 'utf8');
console.log(`Generated ${outputPath}`);

function buildDeveloperSchemasFromPrismaSchema(schemaSource) {
  const models = parseModels(schemaSource);

  return models.map((model) => ({
    id: model.tableName,
    name: model.tableName,
    feature: inferFeature(model.tableName),
    domain: inferDomain(model.tableName),
    description: `Snapshot técnico derivado de Prisma para ${model.tableName}.`,
    fields: model.fields.map((field) => {
      const relation = model.relations.find((item) => item.source === `${model.tableName}.${field.name}`);
      return {
        name: field.name,
        type: field.type,
        nullable: field.nullable,
        ...(field.primaryKey ? { primaryKey: true } : {}),
        ...(relation ? { reference: relation.reference } : {}),
        description: `Campo ${field.name} documentado desde ${model.tableName}.`,
      };
    }),
    relations: model.relations,
  }));
}

function parseModels(schemaSource) {
  const rawModels = [...schemaSource.matchAll(/model\s+(\w+)\s*\{([\s\S]*?)\n\}/g)];
  const tableNames = new Map();

  for (const [, modelName, body] of rawModels) {
    tableNames.set(modelName, extractTableName(modelName, body));
  }

  return rawModels.map(([, modelName, body]) => parseModel(modelName, body, tableNames));
}

function parseModel(modelName, body, tableNames) {
  const tableName = extractTableName(modelName, body);
  const lines = body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('//'));

  const fields = [];
  const relations = [];

  for (const line of lines) {
    if (line.startsWith('@@')) continue;

    const field = parseScalarField(line);
    if (field) {
      fields.push(field);
      continue;
    }

    const relation = parseRelation(line, tableName, tableNames);
    if (relation) {
      relations.push(relation);
    }
  }

  return { modelName, tableName, fields, relations };
}

function parseScalarField(line) {
  const parts = line.split(/\s+/);
  if (parts.length < 2) return null;

  const [name, rawType] = parts;
  if (!name || !rawType) return null;
  if (rawType.includes('[]')) return null;
  if (line.includes('@relation(')) return null;
  if (name.startsWith('@@')) return null;

  const type = rawType.endsWith('?') ? rawType.slice(0, -1) : rawType;
  return {
    name,
    type,
    nullable: rawType.endsWith('?'),
    primaryKey: line.includes('@id'),
  };
}

function parseRelation(line, sourceTableName, tableNames) {
  if (!line.includes('@relation(')) return null;

  const relationMatch = line.match(/^\w+\s+(\w+)\??\s+@relation\(fields:\s*\[(\w+)\],\s*references:\s*\[(\w+)\]/);
  if (!relationMatch) return null;

  const [, targetModelName, sourceFieldName, targetFieldName] = relationMatch;
  const targetTableName = tableNames.get(targetModelName) ?? fallbackTableName(targetModelName);
  const reference = `${targetTableName}.${targetFieldName}`;

  return {
    source: `${sourceTableName}.${sourceFieldName}`,
    target: reference,
    reference,
    label: `${sourceTableName}.${sourceFieldName} -> ${reference}`,
  };
}

function extractTableName(modelName, body) {
  const match = body.match(/@@map\("([^"]+)"\)/);
  return match?.[1] ?? fallbackTableName(modelName);
}

function fallbackTableName(modelName) {
  return modelName
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/-/g, '_')
    .toLowerCase();
}

function inferDomain(tableName) {
  if (tableName.includes('user') || tableName.includes('role') || tableName.includes('auth') || tableName.includes('permission')) {
    return 'identity';
  }
  if (tableName.includes('order') || tableName.includes('payment') || tableName.includes('reservation')) {
    return 'service';
  }
  if (tableName.includes('product') || tableName.includes('menu') || tableName.includes('modifier') || tableName.includes('combo') || tableName.includes('platter')) {
    return 'catalog';
  }
  if (tableName.includes('time_entry') || tableName.includes('floor') || tableName.includes('table') || tableName.includes('restaurant')) {
    return 'operations';
  }
  if (tableName.includes('log') || tableName.includes('outbox')) {
    return 'platform';
  }
  return 'core';
}

function inferFeature(tableName) {
  if (tableName.includes('auth') || tableName.includes('role') || tableName.includes('permission')) {
    return 'auth';
  }
  if (tableName.includes('user')) {
    return 'users';
  }
  if (tableName.includes('order') || tableName.includes('payment')) {
    return 'orders';
  }
  if (tableName.includes('reservation') || tableName.includes('restaurant') || tableName.includes('table') || tableName.includes('floor')) {
    return 'restaurants';
  }
  if (tableName.includes('product') || tableName.includes('menu') || tableName.includes('modifier') || tableName.includes('combo') || tableName.includes('platter')) {
    return 'catalog';
  }
  if (tableName.includes('time_entry') || tableName.includes('schedule') || tableName.includes('shift')) {
    return 'scheduling';
  }
  if (tableName.includes('log') || tableName.includes('outbox') || tableName.includes('audit')) {
    return 'developer';
  }
  return 'platform';
}
