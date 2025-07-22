import { Collection } from "../src/lib/collection";
import { loadData } from "../src/utils/load-data";
import { saveData } from "../src/utils/save-data";
import { SnapJson } from "../src/lib/snapjson";
// import * as shortcutFunc from "../src/utils/shortcutFunc";
import { DatabaseInfoOptionType } from "../src/types/orm.type";
// import { Document } from "src/lib/document";

jest.mock("src/utils/load-data", () => ({
  loadData: jest.fn(),
}));

jest.mock("src/utils/save-data", () => ({
  saveData: jest.fn(),
}));

jest.spyOn(SnapJson.prototype, "isExistCollection").mockResolvedValue(true);

/**
 *
 * findById
 * findOne
 * find
 *
 * add
 * create
 * insertOne
 * insertMany
 *
 * updateOne
 * updateMany
 *
 * deleteOne
 * deleteMany

 */

describe("relation", () => {
  let collection;
  const mockDataBase = {
    databaseInfo: { splitFile: false },
    collectionInfo: [
      {
        collectionName: "marks",
        idStrategy: "increment",
        unique: [],
        createdAt: true,
        updatedAt: true,
        relations: [
          {
            collectionName: "student",
            localKey: "studentId",
            foreignKey: "__id",
            as: "student",
            onDelete: "SET NULL",
            onUpdate: "CASCADE",
            relationType: "belongsTo",
          },
        ],
      },
      {
        collectionName: "student",
        idStrategy: "increment",
        unique: [],
        createdAt: false,
        updatedAt: false,
        relations: [
          {
            collectionName: "marks",
            localKey: "studentId",
            foreignKey: "__id",
            as: "marks",
            onDelete: "RESTRICT",
            onUpdate: "CASCADE",
            relationType: "hasOne",
          },
        ],
      },
      {
        collectionName: "classroom",
        idStrategy: "increment",
        unique: [],
        createdAt: false,
        updatedAt: false,
        relations: [
          {
            collectionName: "student",
            localKey: "classroomId",
            foreignKey: "__id",
            as: "student",
            onDelete: "RESTRICT",
            onUpdate: "CASCADE",
            relationType: "hasMany",
          },
        ],
      },
    ],
    collectionData: {
      classroom: [
        {
          form: 1,
          __id: "1",
        },
        {
          form: 2,
          __id: "2",
        },
      ],
      student: [
        {
          __id: "1",
          classroomId: "1",
          name: "Herik",
        },
        {
          __id: "2",
          classroomId: "2",
          name: "Patrick",
        },
      ],
      marks: [
        {
          __id: "1",
          studentId: "1",
          marks: 6,
        },
        {
          __id: "2",
          studentId: "3",
          marks: 9,
        },
      ],
    },
  };
  beforeEach(() => {
    collection = new Collection("student");
    (loadData as jest.Mock).mockClear();
    (saveData as jest.Mock).mockClear();
    (loadData as jest.Mock).mockImplementation(
      jest.fn(({ flag }) => {
        if (flag === "orm-info")
          return structuredClone(mockDataBase.databaseInfo);
        else if (flag === "collection-info")
          return structuredClone(mockDataBase.collectionInfo);
        else return structuredClone(mockDataBase.collectionData[flag]);
      })
    );
  });

  describe("inserting", () => {
    it("should stringify localKey when creating document with relation", async () => {
      collection = new Collection("marks");
      await collection.add({ studentId: 1, marks: 10 });

      const studentId = (saveData as jest.Mock).mock.calls[0][0][2].studentId;
      expect(studentId === "1").toBeTruthy();
    });
  });

  describe("update", () => {
    it("should stringify localKey when updating document with relation", async () => {
      collection = new Collection("marks");
      await (collection as Collection<any>).updateOne(
        { studentId: 1, marks: 10 },
        { __id: "1" }
      );

      const studentId = (saveData as jest.Mock).mock.calls[0][0][0].studentId;
      expect(studentId === "1").toBeTruthy();
    });

    it("should cascade update to related records (ON UPDATE CASCADE)", async () => {
      const data = {
        classroom: [{ __id: "1", form: 1, id: "1" }],
        student: [{ __id: "1", classroomId: "1", name: "Herik", id: "1" }],
        marks: [{ __id: "1", studentId: "1", marks: 6, id: "1" }],
      };
      (loadData as jest.Mock).mockImplementation(
        jest.fn(({ flag }) => {
          if (flag === "collection-info")
            return [
              {
                collectionName: "classroom",
                unique: [],
                relations: [
                  {
                    collectionName: "student",
                    localKey: "classroomId",
                    foreignKey: "id",
                    onUpdate: "CASCADE",
                    relationType: "hasMany",
                  },
                ],
              },
              {
                collectionName: "student",
                unique: [],
                relations: [
                  {
                    collectionName: "marks",
                    localKey: "studentId",
                    foreignKey: "id",
                    onUpdate: "CASCADE",
                    relationType: "hasOne",
                  },
                ],
              },
              {
                collectionName: "marks",
                unique: [],
                relations: [
                  {
                    collectionName: "student",
                    localKey: "studentId",
                    foreignKey: "id",
                    onUpdate: "CASCADE",
                    relationType: "belongsTo",
                  },
                ],
              },
            ];
          else return data[flag];
        })
      );

      collection = new Collection("student");
      await (collection as Collection<any>).updateOne(
        { id: "2" },
        { __id: "1" }
      );

      expect(data.student[0].id).toBe("2");
      expect(data.marks[0].studentId).toBe("2");
    });

    it("should set foreign key to null on update (ON UPDATE SET NULL)", async () => {
      const data = {
        student: [{ __id: "1", classroomId: "1", name: "Herik", id: "1" }],
        marks: [{ __id: "1", studentId: "1", marks: 6, id: "1" }],
      };
      (loadData as jest.Mock).mockImplementation(
        jest.fn(({ flag }) => {
          if (flag === "collection-info")
            return [
              {
                collectionName: "student",
                unique: [],
                relations: [],
              },
              {
                collectionName: "marks",
                unique: [],
                relations: [
                  {
                    collectionName: "student",
                    localKey: "studentId",
                    foreignKey: "id",
                    onUpdate: "SET NULL",
                    relationType: "belongsTo",
                  },
                ],
              },
            ];
          else return data[flag];
        })
      );

      collection = new Collection("student");
      await (collection as Collection<any>).updateOne(
        { id: "2" },
        { __id: "1" }
      );

      expect(data.student[0].id).toBe("2");
      expect(data.marks[0].studentId).toBeNull();
    });

    it("should restrict update when related records exist (ON UPDATE RESTRICT)", async () => {
      const data = {
        student: [{ __id: "1", classroomId: "1", name: "Herik", id: "1" }],
        marks: [{ __id: "1", studentId: "1", marks: 6, id: "1" }],
      };
      (loadData as jest.Mock).mockImplementation(
        jest.fn(({ flag }) => {
          if (flag === "collection-info")
            return [
              {
                collectionName: "student",
                unique: [],
                relations: [
                  {
                    collectionName: "marks",
                    localKey: "studentId",
                    foreignKey: "id",
                    onUpdate: "RESTRICT",
                    relationType: "hasMany",
                  },
                ],
              },
              {
                collectionName: "marks",
                unique: [],
                relations: [],
              },
            ];
          else return data[flag];
        })
      );

      collection = new Collection("student");
      await expect(
        (collection as Collection<any>).updateOne({ id: "2" }, { __id: "1" })
      ).rejects.toThrowError();
    });

    it("should prevent update with no action when related records exist (ON UPDATE NO ACTION)", async () => {
      const data = {
        student: [{ __id: "1", classroomId: "1", name: "Herik", id: "1" }],
        marks: [{ __id: "1", studentId: "1", marks: 6, id: "1" }],
      };
      (loadData as jest.Mock).mockImplementation(
        jest.fn(({ flag }) => {
          if (flag === "collection-info")
            return [
              {
                collectionName: "student",
                unique: [],
                relations: [],
              },
              {
                collectionName: "marks",
                unique: [],
                relations: [
                  {
                    collectionName: "student",
                    localKey: "studentId",
                    foreignKey: "id",
                    onUpdate: "NO ACTION",
                    relationType: "belongsTo",
                  },
                ],
              },
            ];
          else return data[flag];
        })
      );

      collection = new Collection("student");
      await (collection as Collection<any>).updateOne(
        { id: "2" },
        { __id: "1" }
      );
      expect(data.student[0].id).toBe("2");
      expect(data.marks[0].studentId).toBe("1");
    });
  });

  describe("delete", () => {
    it("should cascade delete to related records (ON DELETE CASCADE)", async () => {
      const data = {
        classroom: [{ __id: "1", form: 1, id: "1" }],
        student: [{ __id: "1", classroomId: "1", name: "Herik", id: "1" }],
        marks: [{ __id: "1", studentId: "1", marks: 6, id: "1" }],
      };
      (loadData as jest.Mock).mockImplementation(
        jest.fn(({ flag }) => {
          if (flag === "collection-info")
            return [
              {
                collectionName: "classroom",
                unique: [],
                relations: [
                  {
                    collectionName: "student",
                    localKey: "classroomId",
                    foreignKey: "id",
                    onDelete: "CASCADE",
                    relationType: "hasMany",
                  },
                ],
              },
              {
                collectionName: "student",
                unique: [],
                relations: [],
              },
              {
                collectionName: "marks",
                unique: [],
                relations: [
                  {
                    collectionName: "student",
                    localKey: "studentId",
                    foreignKey: "id",
                    onDelete: "CASCADE",
                    relationType: "belongsTo",
                  },
                ],
              },
            ];
          else return data[flag];
        })
      );

      collection = new Collection("classroom");
      await (collection as Collection<any>).deleteOne({ __id: "1" });

      expect(data.classroom.length).toBe(0);
      expect(data.student.length).toBe(0);
      expect(data.marks.length).toBe(0);
    });

    it("should set foreign key to null on delete (ON DELETE SET NULL)", async () => {
      const data = {
        student: [{ __id: "1", classroomId: "1", name: "Herik", id: "1" }],
        marks: [{ __id: "1", studentId: "1", marks: 6, id: "1" }],
      };
      (loadData as jest.Mock).mockImplementation(
        jest.fn(({ flag }) => {
          if (flag === "collection-info")
            return [
              {
                collectionName: "student",
                unique: [],
                relations: [
                  {
                    collectionName: "marks",
                    localKey: "studentId",
                    foreignKey: "id",
                    onDelete: "SET NULL",
                    relationType: "hasOne",
                  },
                ],
              },
              {
                collectionName: "marks",
                unique: [],
                relations: [],
              },
            ];
          else return data[flag];
        })
      );

      collection = new Collection("student");
      await (collection as Collection<any>).deleteOne({ __id: "1" });

      expect(data.student.length).toBe(0);
      expect(data.marks[0].studentId).toBeNull;
    });

    it("should restrict delete when related records exist (ON DELETE RESTRICT)", async () => {
      const data = {
        student: [{ __id: "1", classroomId: "1", name: "Herik", id: "1" }],
        marks: [{ __id: "1", studentId: "1", marks: 6, id: "1" }],
      };
      (loadData as jest.Mock).mockImplementation(
        jest.fn(({ flag }) => {
          if (flag === "collection-info")
            return [
              {
                collectionName: "student",
                unique: [],
                relations: [
                  {
                    collectionName: "marks",
                    localKey: "studentId",
                    foreignKey: "id",
                    onDelete: "RESTRICT",
                    relationType: "hasMany",
                  },
                ],
              },
              {
                collectionName: "marks",
                unique: [],
                relations: [],
              },
            ];
          else return data[flag];
        })
      );

      collection = new Collection("student");
      await expect(
        (collection as Collection<any>).deleteOne({ id: "1" })
      ).rejects.toThrowError();
    });

    it("should prevent delete with no action when related records exist (ON DELETE NO ACTION)", async () => {
      const data = {
        student: [{ __id: "1", classroomId: "1", name: "Herik", id: "1" }],
        marks: [{ __id: "1", studentId: "1", marks: 6, id: "1" }],
      };
      (loadData as jest.Mock).mockImplementation(
        jest.fn(({ flag }) => {
          if (flag === "collection-info")
            return [
              {
                collectionName: "student",
                unique: [],
                relations: [],
              },
              {
                collectionName: "marks",
                unique: [],
                relations: [
                  {
                    collectionName: "student",
                    localKey: "studentId",
                    foreignKey: "id",
                    onDELETE: "NO ACTION",
                    relationType: "belongsTo",
                  },
                ],
              },
            ];
          else return data[flag];
        })
      );

      collection = new Collection("student");
      await (collection as Collection<any>).deleteOne({ id: "1" });
      expect(data.student.length).toBe(0);
      expect(data.marks[0].studentId).toBe("1");
    });
  });

  describe("select", () => {
    it("should select collection with child", async () => {
      const collection = new Collection("student");
      const result = await collection.findOne(
        { __id: "1" },
        { include: "marks", type: "object", select: ["__id", "marks"] as any }
      );

      expect(result).toEqual({
        __id: "1",
        marks: { __id: "1", studentId: "1", marks: 6 },
      });
    });

    it("should select collection with parent", async () => {
      const collection = new Collection<any>("marks");
      const result = await collection.findOne(
        { __id: "1" },
        { include: "student", type: "object", select: ["__id", "student"] }
      );

      expect(result).toEqual({
        __id: "1",
        student: { __id: "1", classroomId: "1", name: "Herik" },
      });
    });

    it("should select collection with match child", async () => {
      const collection = new Collection("student");
      const result = await collection.findOne(
        { __id: "1" },
        {
          include: { collectionName: "marks", match: { __id: 2 } },
          type: "object",
          select: ["__id", "marks"] as any,
        }
      );

      expect(result).toEqual({
        __id: "1",
        marks: null,
      });
    });

    it("should select collection with child having empted array", async () => {
      const collection = new Collection<any>("classroom");
      const result = await collection.findOne(
        { __id: "1" },
        {
          include: { collectionName: "student", match: { __id: 2 } },
          type: "object",
          select: ["__id", "student"],
        }
      );

      expect(result).toEqual({
        __id: "1",
        student: [],
      });
    });

    it("should select collection with some of properties of child", async () => {
      const collection = new Collection("classroom");
      const result = await collection.findOne(
        { __id: "1" },
        {
          include: "student",
          type: "object",
          select: ["__id"],
        }
      );

      expect(result).toEqual({ __id: "1" });
    });

    it("should select collection and limit, offset, sort child records", async () => {
      const data = {
        classroom: [{ __id: "1", form: 1, id: "1" }],
        student: [
          { __id: "1", classroomId: "1", name: "Smith" },
          { __id: "2", classroomId: "1", name: "Chloe" },
          { __id: "3", classroomId: "1", name: "Bob" },
          { __id: "4", classroomId: "1", name: "Mark" },
          { __id: "5", classroomId: "1", name: "Rick" },
        ],
      };
      (loadData as jest.Mock).mockImplementation(
        jest.fn(({ flag }) => {
          if (flag === "collection-info")
            return [
              {
                collectionName: "classroom",
                unique: [],
                relations: [
                  {
                    collectionName: "student",
                    localKey: "classroomId",
                    foreignKey: "id",
                    relationType: "hasMany",
                    as: "student",
                  },
                ],
              },
              {
                collectionName: "student",
                unique: [],
                relations: [],
              },
            ];
          else return data[flag];
        })
      );

      const collection = new Collection<any>("classroom");
      const result = await collection.findOne(
        { __id: "1" },
        {
          include: {
            collectionName: "student",
            select: ["name"],
            limit: 2,
            offset: 2,
            sort: { property: "name", flag: "desc" },
          },
          type: "object",
          select: ["__id", "student"],
        }
      );

      expect(result).toEqual({
        __id: "1",
        student: [{ name: "Mark" }, { name: "Chloe" }],
      });
    });

    it("should select collection and select nested child", async () => {
      const collection = new Collection<any>("classroom");
      const result = await collection.findOne(
        { __id: "1" },
        {
          include: {
            collectionName: "student",
            select: ["name", "marks"],
            include: {
              collectionName: "marks",
              select: ["marks", "student"],
              include: { collectionName: "student", select: "name" },
            },
          },
          type: "object",
          select: ["__id", "student"],
        }
      );

      expect(result).toEqual({
        __id: "1",
        student: [
          { name: "Herik", marks: { marks: 6, student: { name: "Herik" } } },
        ],
      });
    });
  });
});
