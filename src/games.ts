import collection from './data/travis-collection.json'

export type Game = {
  bggId: number
  title: string
  year: number
  coverUrl: string
  thumbUrl: string
  spineWidth: number
}

export const games = collection as Game[]
export const gameById = (id: number) => games.find((g) => g.bggId === id)
export const SHELF_H = 280
