export type Index = {
	cid: string;
	timestamp: number;
}

export type IndexStorage = {
	appId: string;
	index: Index[];
	lastUpdated: number;
}

export type ArchivedComment = {
	comment: string;
	timestamp: number;
}

export type Comment = {
	commentId: string;
	replies: Comment[];
	comment: string;
	history: ArchivedComment[];
	timestamp: number;
}