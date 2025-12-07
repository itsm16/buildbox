import {v4 as uuid} from 'uuid'
import {generateUsername} from 'unique-username-generator'

export function generateShortId() {
    return uuid().slice(0, 8)
}

export function generateRandomUsername() {
    return generateUsername('-')
}