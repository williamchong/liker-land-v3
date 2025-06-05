declare interface ISCNStakeholder {
  contributionType: string
  entity: {
    '@id': string
    'name': string
    'description'?: string
    'identifier'?: {
      '@type': string
      'propertyID': string
      'value': string
    }[]
    'sameAs'?: string[]
    'url': string
  }
  rewardProportion: number
}

declare interface PotentialAction {
  '@type': string
}

declare interface ReadActionEntryPoint {
  '@type': 'EntryPoint'
  'contentType': string
  'encodingType': string
  'url': string
  'name': string
}

declare type ReadAction = {
  '@type': 'ReadAction'
  'target': ReadActionEntryPoint[]
} & PotentialAction

declare interface ISCNContentMetadata {
  '@context': string
  '@type': string
  'author': string | { name: string, description: string }
  'description': string
  'exifInfo': {
    Format: string
    Size: number
  }[]
  'inLanguage': string
  'isbn': string
  'keywords': string
  'name': string
  'sameAs': string[]
  'potentialAction'?: PotentialAction
  'publisher': string
  'datePublished'?: string
  'thumbnailUrl': string
  'url'?: string
  'external_url'?: string
  'usageInfo': string
  'version': string
}

declare interface ISCNData {
  '@id': string
  '@type': string
  'contentFingerprints': string[]
  'contentMetadata': ISCNContentMetadata
  'recordNotes': string
  'recordTimestamp': string
  'recordVersion': number
  'stakeholders': ISCNStakeholder[]
}

declare interface ISCNRecord {
  ipld: string
  data: ISCNData
}
