import { IndexStorage } from "../types"

export class BaseInterface {
	protected appId: string;
	protected static instance: BaseInterface;

	constructor() {
		// static initialization
	}

	protected async init(...args: string[]) {
		// dynamic initialization
	}

	static async create(...args: string[]): Promise<BaseInterface> {
		if (!this.instance) {
			const newInstance = new this();
			await newInstance.init(...args);
			this.instance = newInstance;
		}
		return this.instance;
	}

	protected mergeIndexes(fromIndex: IndexStorage, toIndex: IndexStorage): IndexStorage {
		for (const toPage of Object.keys(toIndex.index)) {
			if (toPage in fromIndex.index) {
				fromIndex.index[toPage] = toIndex.index[toPage];
			}
		}

		return fromIndex;
	}
}