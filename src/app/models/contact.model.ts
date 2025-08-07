export interface Contact {
	id: string;
	firstName: string;
	lastName: string;
	email: string;
	phone: string;
	address?: string;
	notes?: string;
	createdAt: Date;
	updatedAt: Date;
}

export type CreateContact = Omit<Contact, "id" | "createdAt" | "updatedAt">;
export type UpdateContact = Partial<CreateContact>;
