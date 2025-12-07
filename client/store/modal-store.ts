import {create} from 'zustand'

export const useModalStore = create((set) => ({
    cloneModalOpen: false,
    setCloneModalOpen: (cloneModalOpen: boolean) => set({cloneModalOpen}),
}))
