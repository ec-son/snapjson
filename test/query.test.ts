import { Query } from "../src/lib/query";
import { QueryType } from "../src/type/orm.type";

interface collectionType {
  _id: number;
  firstname: string;
  email: string;
  age: number;
  birthday: Date;
  marks: number[];
  color: string[];
  dates: Date[];
}

interface queryType extends QueryType<Partial<collectionType>> {
  id: number | number[];
}

const collectionDB: collectionType[] = [
  {
    _id: 1,
    firstname: "Mary",
    email: "marymaxwell@parcoe.com",
    age: 16,
    marks: [19, 0, 7, 13, 7],
    color: ["green", "black", "dark", "orange"],
    birthday: new Date("2022-02-16T07:33:43"),
    dates: [
      new Date("2020-08-07T08:04:54"),
      new Date("2023-04-13T06:53:47"),
      new Date("2023-02-04T05:56:14"),
      new Date("2021-01-29T05:45:01"),
      new Date("2020-09-30T11:54:41"),
    ],
  },
  {
    _id: 2,
    firstname: "Rice",
    email: "ricemaxwell@parcoe.com",
    age: 19,
    marks: [20, 18, 19, 3, 13],
    color: ["cyan"],
    birthday: new Date("2019-03-01T03:40:48"),
    dates: [
      new Date("2022-08-22T07:54:58"),
      new Date("2020-12-06T06:18:04"),
      new Date("2020-11-28T07:05:54"),
      new Date("2022-07-24T12:35:08"),
      new Date("2023-04-21T09:25:34"),
    ],
  },
  {
    _id: 3,
    firstname: "Carole",
    email: "carolemaxwell@parcoe.com",
    age: 14,
    marks: [8, 4, 20, 17, 11],
    color: ["purple"],
    birthday: new Date("2012-08-09T02:32:57"),
    dates: [
      new Date("2022-04-18T07:42:26"),
      new Date("2020-10-02T12:09:11"),
      new Date("2020-10-23T06:36:35"),
      new Date("2022-07-01T07:20:31"),
      new Date("2020-03-12T09:30:33"),
    ],
  },
  {
    _id: 4,
    firstname: "Potts",
    email: "pottsmaxwell@parcoe.com",
    age: 19,
    marks: [5, 2, 15, 0, 11],
    color: ["marron"],
    birthday: new Date("2014-12-24T02:12:10"),
    dates: [
      new Date("2020-01-20T03:05:58"),
      new Date("2020-07-28T06:22:07"),
      new Date("2021-10-06T12:07:14"),
      new Date("2022-04-18T09:33:06"),
      new Date("2021-03-26T08:19:57"),
    ],
  },
  {
    _id: 5,
    firstname: "Rowena",
    email: "rowenamaxwell@parcoe.com",
    age: 17,
    marks: [15, 14, 18, 5, 15],
    color: ["cyan", "white", "orange"],
    birthday: new Date("2016-09-14T08:03:38"),
    dates: [
      new Date("2022-04-27T02:27:59"),
      new Date("2021-01-31T08:32:28"),
      new Date("2020-04-29T07:36:12"),
      new Date("2023-03-05T04:05:12"),
      new Date("2020-04-09T06:58:17"),
    ],
  },
  {
    _id: 6,
    firstname: "Riddle",
    email: "riddlemaxwell@parcoe.com",
    age: 14,
    marks: [2, 10, 3, 1, 6],
    color: ["yellow", "cyan", "yellow"],
    birthday: new Date("2013-03-19T03:28:50"),
    dates: [
      new Date("2020-01-16T11:46:12"),
      new Date("2022-07-30T10:38:47"),
      new Date("2020-08-11T04:00:17"),
      new Date("2021-12-20T02:31:19"),
      new Date("2022-04-07T06:57:51"),
    ],
  },
  {
    _id: 7,
    firstname: "Edwards",
    email: "edwardsmaxwell@parcoe.com",
    age: 15,
    marks: [18, 17, 8, 3, 20],
    color: ["blue", "orange", "black", "yellow", "dark"],
    birthday: new Date("2010-02-02T10:46:38"),
    dates: [
      new Date("2023-03-30T09:16:12"),
      new Date("2021-01-02T01:21:26"),
      new Date("2022-04-12T06:41:29"),
      new Date("2021-10-29T04:49:03"),
      new Date("2022-03-07T01:14:14"),
    ],
  },
  {
    _id: 8,
    firstname: "Holmes",
    email: "holmesmaxwell@parcoe.com",
    age: 14,
    marks: [8, 2, 0, 16, 17],
    color: ["white", "white", "marron", "white", "cyan"],
    birthday: new Date("2021-08-25T08:38:35"),
    dates: [
      new Date("2021-04-22T11:19:44"),
      new Date("2021-06-26T08:12:53"),
      new Date("2022-11-14T03:01:19"),
      new Date("2021-03-24T04:38:32"),
      new Date("2021-05-29T01:01:53"),
    ],
  },
  {
    _id: 9,
    firstname: "Chapman",
    email: "chapmanmaxwell@parcoe.com",
    age: 15,
    marks: [9, 8, 13, 20, 2],
    color: ["marron", "purple", "yellow"],
    birthday: new globalThis.Date("2016-08-07T07:01:37"),
    dates: [
      new Date("2022-07-28T07:36:09"),
      new Date("2021-12-21T06:25:44"),
      new Date("2021-04-26T08:49:03"),
      new Date("2020-10-20T09:55:24"),
      new Date("2020-06-25T03:01:53"),
    ],
  },
  {
    _id: 10,
    firstname: "Dianne",
    email: "diannemaxwell@parcoe.com",
    age: 10,
    marks: [17, 20, 11, 12, 12],
    color: ["green", "dark", "yellow", "red"],
    birthday: new Date("2013-11-24T06:00:52"),
    dates: [
      new Date("2021-05-06T09:07:35"),
      new Date("2021-09-30T02:42:00"),
      new Date("2021-09-28T02:54:12"),
      new Date("2021-11-26T08:33:48"),
      new Date("2020-03-23T07:32:53"),
    ],
  },
];

const t = new Date();

describe("operators", () => {
  const table1: queryType[] = [
    // direct
    { _id: 5, id: 5 },
    { firstname: "Edwards", id: 7 },
    { firstname: /ar/, id: [1, 3, 7] },
    { birthday: new Date("2016-08-07T07:01:37"), id: 9 },
    { marks: [8, 4, 20, 17, 11], id: 3 },
    { color: ["cyan", "white", "orange"], id: 5 },
    { color: [/a/, /e/, /e/], id: [5, 9] },
    {
      dates: [
        new Date("2022-07-28T07:36:09"),
        new Date("2021-12-21T06:25:44"),
        new Date("2021-04-26T08:49:03"),
        new Date("2020-10-20T09:55:24"),
        new Date("2020-06-25T03:01:53"),
      ],
      id: 9,
    },
    // $eq
    { _id: { $eq: 6 }, id: 6 },
    { firstname: { $eq: "Carole" }, id: 3 },
    { email: { $eq: /mesmax/ }, id: 8 },
    { birthday: { $eq: new Date("2013-03-19T03:28:50") }, id: 6 },
    { marks: { $eq: [8, 4, 20, 17, 11] }, id: 3 },
    { color: { $eq: ["cyan", "white", "orange"] }, id: 5 },
    { color: { $eq: [/a/, /e/, /e/] }, id: [5, 9] },
    {
      dates: {
        $eq: [
          new Date("2022-07-28T07:36:09"),
          new Date("2021-12-21T06:25:44"),
          new Date("2021-04-26T08:49:03"),
          new Date("2020-10-20T09:55:24"),
          new Date("2020-06-25T03:01:53"),
        ],
      },
      id: 9,
    },
  ];

  it.each(table1)("should match query with $eq operator", (opts) => {
    const { id, ...query } = opts;
    const queryInstance = new Query<collectionType>(query, collectionDB, {
      select: ["_id"],
    });
    const expected = makeObject(id, true);
    expect(queryInstance.getData()).toEqual(expected);
  });

  const table2: queryType[] = [
    // $ne
    { _id: { $ne: 6 }, id: [1, 2, 3, 4, 5, 7, 8, 9, 10] },
    { firstname: { $ne: "Carole" }, id: [1, 2, 4, 5, 6, 7, 8, 9, 10] },
    { firstname: { $ne: /e/ }, id: [1, 4, 7, 9] },
    {
      birthday: { $ne: new Date("2013-03-19T03:28:50") },
      id: [1, 2, 3, 4, 5, 7, 8, 9, 10],
    },
    { marks: { $ne: [2, 10, 3, 1, 6] }, id: [1, 2, 3, 4, 5, 7, 8, 9, 10] },
    {
      color: { $ne: ["yellow", "cyan", "yellow"] },
      id: [1, 2, 3, 4, 5, 7, 8, 9, 10],
    },
    {
      color: { $ne: [/yell/, /cyan/, /yell/] },
      id: [1, 2, 3, 4, 5, 7, 8, 9, 10],
    },
    {
      dates: {
        $ne: [
          new Date("2020-01-16T11:46:12"),
          new Date("2022-07-30T10:38:47"),
          new Date("2020-08-11T04:00:17"),
          new Date("2021-12-20T02:31:19"),
          new Date("2022-04-07T06:57:51"),
        ],
      },
      id: [1, 2, 3, 4, 5, 7, 8, 9, 10],
    },
  ];

  it.each(table2)("should match query with $ne operator", (opts) => {
    const { id, ...query } = opts;
    const queryInstance = new Query<collectionType>(query, collectionDB);
    const expected = makeObject(id);
    expect(queryInstance.getData()).toEqual(expected);
  });

  const table3: queryType[] = [
    // $in
    { _id: { $in: [4, 6] }, id: [4, 6] },
    { firstname: { $in: ["Chapman", "Dianne"] }, id: [9, 10] },
    { firstname: { $in: [/Chap/, /Dian/] }, id: [9, 10] },
    {
      birthday: {
        $in: [new Date("2012-08-09T02:32:57"), new Date("2013-03-19T03:28:50")],
      },
      id: [3, 6],
    },
    // $nin
    { age: { $nin: [10, 14, 15, 17, 19] }, id: 1 },
    {
      firstname: {
        $nin: ["Rowena", "Riddle", "Edwards", "Holmes", "Chapman", "Dianne"],
      },
      id: [1, 2, 3, 4],
    },
    { firstname: { $nin: [/a/, /e/] }, id: 4 },
    {
      birthday: {
        $nin: [
          new Date("2014-12-24T00:12:10.000Z"),
          new Date("2016-09-14T06:03:38.000Z"),
          new Date("2013-03-19T01:28:50.000Z"),
          new Date("2021-08-25T06:38:35.000Z"),
          new Date("2010-02-02T08:46:38.000Z"),
          new Date("2016-08-07T05:01:37.000Z"),
          new Date("2013-11-24T04:00:52.000Z"),
        ],
      },
      id: [1, 2, 3],
    },
  ];

  it.each(table3)("should match query with $in, $nin operator", (opts) => {
    const { id, ...query } = opts;
    const queryInstance = new Query<collectionType>(query, collectionDB);
    const expected = makeObject(id);
    expect(queryInstance.getData()).toEqual(expected);
  });

  const table4: queryType[] = [
    // $gt
    { _id: { $gt: 9 }, id: 10 },
    { birthday: { $gt: new Date("2022-01-23") }, id: 1 },

    // $gte
    { _id: { $gte: 10 }, id: 10 },
    { birthday: { $gte: new Date("2022-02-16T07:33:43") }, id: 1 },

    // $lt
    { _id: { $lt: 2 }, id: 1 },
    { birthday: { $lt: new Date("2011-01-23") }, id: 7 },

    // $lte
    { _id: { $lte: 1 }, id: 1 },
    { birthday: { $lte: new Date("2010-02-02T10:46:38") }, id: 7 },
  ];

  it.each(table4)(
    "should match query with $gt $gte $lt $lte operator",
    (opts) => {
      const { id, ...query } = opts;
      const queryInstance = new Query<collectionType>(query, collectionDB);
      const expected = makeObject(id);
      expect(queryInstance.getData()).toEqual(expected);
    }
  );

  const table5: queryType[] = [
    // $contains
    { marks: { $contains: 15 }, id: [4, 5] },
    { marks: { $contains: [0, 15] }, id: 4 },
    { color: { $contains: "blue" }, id: 7 },
    { color: { $contains: ["yellow", "dark"] }, id: [7, 10] },
    { color: { $contains: /blue/ }, id: 7 },
    { color: { $contains: [/yellow/, /dark/] }, id: [7, 10] },
    { dates: { $contains: new Date("2022-04-07T06:57:51") }, id: 6 },
    {
      dates: {
        $contains: [
          new Date("2022-04-07T06:57:51"),
          new Date("2020-08-11T04:00:17"),
        ],
      },
      id: 6,
    },

    // $nocontains
    { marks: { $nocontains: 15 }, id: [1, 2, 3, 6, 7, 8, 9, 10] },
    { marks: { $nocontains: [5, 15] }, id: [1, 2, 3, 6, 7, 8, 9, 10] },
    { color: { $nocontains: "yellow" }, id: [1, 2, 3, 4, 5, 8] },
    {
      color: { $nocontains: ["orange", "black"] },
      id: [2, 3, 4, 5, 6, 8, 9, 10],
    },
    { color: { $nocontains: /yellow/ }, id: [1, 2, 3, 4, 5, 8] },
    {
      color: { $nocontains: [/orange/, /black/] },
      id: [2, 3, 4, 5, 6, 8, 9, 10],
    },
    {
      dates: { $nocontains: new Date("2022-04-07T06:57:51") },
      id: [1, 2, 3, 4, 5, 7, 8, 9, 10],
    },
    {
      dates: {
        $nocontains: [
          new Date("2022-04-07T06:57:51"),
          new Date("2020-08-11T04:00:17"),
        ],
      },
      id: [1, 2, 3, 4, 5, 7, 8, 9, 10],
    },
  ];

  it.each(table5)(
    "should match query with $contains $nocontains operator",
    (opts) => {
      const { id, ...query } = opts;
      const queryInstance = new Query<collectionType>(query, collectionDB);
      const expected = makeObject(id);
      expect(queryInstance.getData()).toEqual(expected);
    }
  );

  const table6: queryType[] = [
    { _id: { $gt: 4, $lt: 6 }, id: 5 },
    { $and: [{ age: { $gt: 15 } }, { marks: { $contains: [19, 0] } }], id: 1 },
    {
      $or: [{ marks: { $contains: [14, 5] } }, { age: { $in: [16] } }],
      id: [5, 1],
    },
    {
      $and: [
        { $or: [{ age: 15 }, { age: 19 }] },
        { color: { $contains: ["marron"] } },
      ],
      id: [9, 4],
    },
    {
      $or: [
        { marks: { $contains: [14, 5] } },
        {
          $and: [
            { age: { $in: [16] } },
            { color: ["green", "black", "dark", /o/] },
          ],
        },
      ],
      id: [5, 1],
    },
  ];

  it.each(table6)("should match query with $and $or operator", (opts) => {
    const { id, ...query } = opts;
    const queryInstance = new Query<collectionType>(query, collectionDB, {
      select: ["_id"],
    });
    const expected = makeObject(id, true);
    expect(queryInstance.getData()).toEqual(expected);
  });
});

function makeObject(
  ids: number | number[],
  isId?: boolean
): collectionType[] | { _id: number }[] {
  if (!Array.isArray(ids)) ids = [ids];
  if (isId) {
    return ids.map((el) => ({ _id: el }));
  }
  return collectionDB.filter((el) => (ids as number[]).includes(el._id));
}
