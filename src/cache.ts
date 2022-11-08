export class Cache {
	private cache: { [key: string]: any } = {};

	public get(key: string) {
		return this.cache[key];
	}

	public set(key: string, value: any) {
		this.cache[key] = value;
	}

	public exists(key: string) {
		return !!this.get(key);
	}

	public getOrSet(key: string, value: any) {
		if (!this.exists(key)) {
			this.set(key, value);
		}
		return this.get(key);
	}

}