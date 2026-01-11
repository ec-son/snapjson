export type DocumentDataType<T extends Object> = {
  [key in keyof T]: T[key];
} & {
  /**
   * Converts this document into JavaScript object.
   * @returns Converted document.
   */
  toObject(): T;
  /**
   * Converts this document into JSON.
   * @returns String representing the document.
   */
  toJSON(): string;

  /**
   * Saves this document.
   * @returns Returns true if the document is successfully saved, false otherwise.
   */
  save(): Promise<boolean>;

  /**
   * Updates this document.
   *
   * Updates the properties of the document and updates the document in the database if the `save` flag is set to true.
   *
   * @param obj - The properties to update.
   * @param save - If true the document will be saved in the database.
   * @returns - Returns true if the document is successfully updated, false otherwise.
   */
  update(obj: Partial<T>, save?: boolean): Promise<boolean>;

  /**
   * Deletes this document.
   * @returns Returns true if the document is successfully deleted, false otherwise.
   */
  delete(): Promise<boolean>;
};
