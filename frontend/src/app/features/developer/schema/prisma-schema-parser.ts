export type DeveloperSchemaField = {
  name: string;
  type: string;
  nullable: boolean;
  primaryKey?: boolean;
  reference?: string;
  description: string;
};

export type DeveloperSchemaRelation = {
  source: string;
  target: string;
  reference: string;
  label: string;
};

export type DeveloperSchemaTable = {
  id: string;
  name: string;
  feature: string;
  domain: string;
  description: string;
  fields: DeveloperSchemaField[];
  relations: DeveloperSchemaRelation[];
};

type PrismaField = {
  name: string;
  type: string;
  nullable: boolean;
  primaryKey: boolean;
};

type PrismaModel = {
  modelName: string;
  tableName: string;
  fields: PrismaField[];
  relations: DeveloperSchemaRelation[];
};

export function buildDeveloperSchemasFromPrismaSchema(schema: string): DeveloperSchemaTable[] {
  const models = parseModels(schema);

  return models.map((model) => ({
    id: model.tableName,
    name: model.tableName,
    feature: inferFeature(model.tableName),
    domain: inferDomain(model.tableName),
    description: describeTable(model.tableName),
    fields: model.fields.map((field) => ({
      name: field.name,
      type: field.type,
      nullable: field.nullable,
      primaryKey: field.primaryKey || undefined,
      reference: model.relations.find((relation) => relation.source === `${model.tableName}.${field.name}`)?.reference,
      description: describeField(model.tableName, field.name),
    })),
    relations: model.relations,
  }));
}

function parseModels(schema: string): PrismaModel[] {
  const rawModels = [...schema.matchAll(/model\s+(\w+)\s*\{([\s\S]*?)\n\}/g)];
  const tableNames = new Map<string, string>();

  for (const [, modelName, body] of rawModels) {
    tableNames.set(modelName, extractTableName(modelName, body));
  }

  return rawModels.map(([, modelName, body]) => parseModel(modelName, body, tableNames));
}

function parseModel(modelName: string, body: string, tableNames: Map<string, string>): PrismaModel {
  const tableName = extractTableName(modelName, body);
  const lines = body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('//'));

  const fields: PrismaField[] = [];
  const relations: DeveloperSchemaRelation[] = [];

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

function parseScalarField(line: string): PrismaField | null {
  const parts = line.split(/\s+/);
  if (parts.length < 2) return null;

  const [name, rawType] = parts;
  if (!name || !rawType) return null;
  if (rawType.includes('[]')) return null;
  if (line.includes('@relation(')) return null;
  if (name.startsWith('@@')) return null;

  const type = rawType.endsWith('?') ? rawType.slice(0, -1) : rawType;
  const nullable = rawType.endsWith('?');

  return {
    name,
    type,
    nullable,
    primaryKey: line.includes('@id'),
  };
}

function parseRelation(line: string, sourceTableName: string, tableNames: Map<string, string>): DeveloperSchemaRelation | null {
  if (!line.includes('@relation(')) return null;

  const relationMatch = line.match(
    /^\w+\s+(\w+)\??\s+@relation\(fields:\s*\[(\w+)\],\s*references:\s*\[(\w+)\]/,
  );

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

function extractTableName(modelName: string, body: string): string {
  const match = body.match(/@@map\("([^"]+)"\)/);
  return match?.[1] ?? fallbackTableName(modelName);
}

function fallbackTableName(modelName: string): string {
  return modelName
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/-/g, '_')
    .toLowerCase();
}

function inferDomain(tableName: string): string {
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

function inferFeature(tableName: string): string {
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

function describeTable(tableName: string): string {
  return `Snapshot técnico derivado de Prisma para ${tableName}.`;
}

function describeField(tableName: string, fieldName: string): string {
  return `Campo ${fieldName} documentado desde ${tableName}.`;
}
