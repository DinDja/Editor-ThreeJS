import type { DataCollection, DataField, DataSchema, OrmTarget } from '@/lib/data-model/types';

const pascal = (value: string) =>
  value
    .replace(/(^|[_\-\s]+)([a-z0-9])/g, (_match, _sep, char: string) => char.toUpperCase())
    .replace(/[^A-Za-z0-9]/g, '') || 'Model';

const camel = (value: string) => {
  const p = pascal(value);
  return p.charAt(0).toLowerCase() + p.slice(1);
};

const prismaScalar = (field: DataField) => {
  if (field.name === 'id') return 'String @id @default(cuid())';
  if (field.type === 'number') return 'Float';
  if (field.type === 'boolean') return 'Boolean';
  if (field.type === 'date' || field.type === 'datetime') return 'DateTime';
  if (field.type === 'json') return 'Json';
  return 'String';
};

const prismaField = (field: DataField) => {
  if (field.type === 'relation' && field.relation) {
    const target = pascal(field.relation.collectionId);
    const optional = field.required ? '' : '?';
    const list = field.relation.kind === 'oneToMany' || field.relation.kind === 'manyToMany' ? '[]' : optional;
    return `  ${field.name} ${target}${list}`;
  }

  const optional = field.required || field.name === 'id' ? '' : '?';
  const unique = field.validation?.unique ? ' @unique' : '';
  const defaultValue =
    field.type === 'datetime' && field.name === 'createdAt'
      ? ' @default(now())'
      : field.type === 'datetime' && field.name === 'updatedAt'
        ? ' @updatedAt'
        : '';
  return `  ${field.name} ${prismaScalar(field)}${optional}${unique}${defaultValue}`;
};

const prismaProvider = (provider: DataSchema['provider']) => {
  if (provider === 'sqlite' || provider === 'postgres' || provider === 'mysql' || provider === 'mongodb') return provider;
  return 'sqlite';
};

export const generatePrismaSchema = (schema: DataSchema): string => {
  const models = schema.collections
    .map((collection) => {
      const fields = collection.fields.map(prismaField).join('\n');
      return `model ${pascal(collection.name)} {\n${fields}\n}`;
    })
    .join('\n\n');

  return `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "${prismaProvider(schema.provider)}"
  url      = env("DATABASE_URL")
}

${models}
`;
};

const drizzleType = (field: DataField) => {
  if (field.name === 'id') return `text('${field.name}').primaryKey()`;
  if (field.type === 'number') return `real('${field.name}')`;
  if (field.type === 'boolean') return `integer('${field.name}', { mode: 'boolean' })`;
  if (field.type === 'date' || field.type === 'datetime') return `integer('${field.name}', { mode: 'timestamp' })`;
  if (field.type === 'json') return `text('${field.name}', { mode: 'json' })`;
  return `text('${field.name}')`;
};

const drizzleField = (field: DataField) => {
  let value = drizzleType(field);
  if (field.required && field.name !== 'id') value += '.notNull()';
  if (field.validation?.unique) value += '.unique()';
  return `  ${camel(field.name)}: ${value},`;
};

export const generateDrizzleSchema = (schema: DataSchema): string => {
  const imports = `import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';`;
  const tables = schema.collections
    .map((collection: DataCollection) => {
      const tableName = collection.name.replace(/[^a-z0-9_]/gi, '_').toLowerCase();
      return `export const ${camel(collection.name)} = sqliteTable('${tableName}', {\n${collection.fields.map(drizzleField).join('\n')}\n});`;
    })
    .join('\n\n');

  return `${imports}\n\n${tables}\n`;
};

export const generateDatabaseSchema = (schema: DataSchema, target: OrmTarget = schema.ormTarget): string => {
  if (target === 'drizzle') return generateDrizzleSchema(schema);
  if (target === 'prisma') return generatePrismaSchema(schema);
  return JSON.stringify(schema, null, 2);
};
