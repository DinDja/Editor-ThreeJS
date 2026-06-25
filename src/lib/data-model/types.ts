export type DataFieldType =
  | 'string'
  | 'text'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'email'
  | 'url'
  | 'image'
  | 'file'
  | 'json'
  | 'enum'
  | 'relation';

export type DataFieldUiHint =
  | 'input'
  | 'textarea'
  | 'richText'
  | 'select'
  | 'checkbox'
  | 'switch'
  | 'datePicker'
  | 'imageUpload'
  | 'fileUpload'
  | 'hidden'
  | 'readonly';

export type DataRelationKind = 'oneToOne' | 'oneToMany' | 'manyToOne' | 'manyToMany';

export type DataFieldValidation = Partial<{
  min: number;
  max: number;
  minLength: number;
  maxLength: number;
  pattern: string;
  unique: boolean;
}>;

export type DataFieldRelation = {
  collectionId: string;
  fieldId?: string;
  kind: DataRelationKind;
  onDelete?: 'cascade' | 'restrict' | 'setNull';
};

export type DataField = {
  id: string;
  name: string;
  label: string;
  type: DataFieldType;
  required: boolean;
  defaultValue?: string | number | boolean | null;
  enumValues?: string[];
  validation?: DataFieldValidation;
  relation?: DataFieldRelation;
  uiHint?: DataFieldUiHint;
  system?: boolean;
  description?: string;
};

export type QueryOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | 'greaterThan'
  | 'greaterThanOrEqual'
  | 'lessThan'
  | 'lessThanOrEqual'
  | 'in'
  | 'isEmpty'
  | 'isNotEmpty';

export type QueryFilter = {
  id: string;
  fieldId: string;
  operator: QueryOperator;
  value?: string | number | boolean;
};

export type QuerySort = {
  fieldId: string;
  direction: 'asc' | 'desc';
};

export type SavedQuery = {
  id: string;
  name: string;
  collectionId: string;
  filters: QueryFilter[];
  sort?: QuerySort[];
  limit?: number;
};

export type DataCollectionConfig = Partial<{
  icon: string;
  color: string;
  timestamps: boolean;
  softDelete: boolean;
  publicRead: boolean;
  publicWrite: boolean;
}>;

export type DataCollection = {
  id: string;
  name: string;
  label: string;
  description?: string;
  fields: DataField[];
  queries: SavedQuery[];
  config: DataCollectionConfig;
};

export type DatabaseProvider = 'sqlite' | 'postgres' | 'mysql' | 'mongodb' | 'json';

export type OrmTarget = 'prisma' | 'drizzle' | 'none';

export type DataSchema = {
  version: 1;
  name: string;
  provider: DatabaseProvider;
  ormTarget: OrmTarget;
  collections: DataCollection[];
  createdAt: string;
  updatedAt: string;
};

export const DATA_FIELD_TYPES: DataFieldType[] = [
  'string',
  'text',
  'number',
  'boolean',
  'date',
  'datetime',
  'email',
  'url',
  'image',
  'file',
  'json',
  'enum',
  'relation',
];

export const DATA_FIELD_TYPE_LABELS: Record<DataFieldType, string> = {
  string: 'Texto curto',
  text: 'Texto longo',
  number: 'Numero',
  boolean: 'Booleano',
  date: 'Data',
  datetime: 'Data e hora',
  email: 'Email',
  url: 'URL',
  image: 'Imagem',
  file: 'Arquivo',
  json: 'JSON',
  enum: 'Lista',
  relation: 'Relacao',
};

export const QUERY_OPERATORS: QueryOperator[] = [
  'equals',
  'notEquals',
  'contains',
  'startsWith',
  'endsWith',
  'greaterThan',
  'greaterThanOrEqual',
  'lessThan',
  'lessThanOrEqual',
  'in',
  'isEmpty',
  'isNotEmpty',
];

export const QUERY_OPERATOR_LABELS: Record<QueryOperator, string> = {
  equals: 'Igual',
  notEquals: 'Diferente',
  contains: 'Contem',
  startsWith: 'Comeca com',
  endsWith: 'Termina com',
  greaterThan: 'Maior que',
  greaterThanOrEqual: 'Maior/igual',
  lessThan: 'Menor que',
  lessThanOrEqual: 'Menor/igual',
  in: 'Esta em',
  isEmpty: 'Vazio',
  isNotEmpty: 'Nao vazio',
};
