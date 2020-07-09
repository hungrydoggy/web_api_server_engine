# 개요
`association`에 관한 문서  
`ManyToMany`를 자동으로 달아주고, 관리해줌.  

# 간단 예제
컬럼 이름 맨 앞에 `@`를 붙여서 사용한다.
```javascript
const db = connect();
const Users__Groups = db.define('Users__Groups',
  { // field infos
    id: {
        type         : Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey   : true,
        allowNull    : false,
    },
    '@user_id': {    /*** field ***/
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: '&Users.CR',  /*** comment ***/
    },
    '@group_id': {    /*** field ***/
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: '&Groups.CR',  /*** comment ***/
    },
  },
  { // options
    indexes: [
      { fields: ['@user_id' ], name: 'user_id' , },
      { fields: ['@group_id'], name: 'group_id', },
    ],
    charset: 'utf8mb4',
    collate: 'utf8mb4_general_ci'
  },
);

const User  = require('./User' );
const Group = require('./Group');

db_util.linkByManyToMany(Users__Groups, [User, Group, ]);

module.exports = Users__Groups;
```

# 기본 규칙
다음은 생략이 없는 기본 규칙의 예제다.
```javascript
'@group_id:groups.Groups.CR': {  /*** field ***/
  type: Sequelize.INTEGER,
  allowNull: true,
  defaultValue: null,
},
```
기본적으로, 컬럼의 `이름`으로 설정하며, 맨 앞에 `@`가 붙게 된다.

`.`을 기준으로 크게 3부분으로 나뉜다.  
`@`\<head\>`.`\<middle\>`.`\<tail\>  

따라서 예제 `@group_id:groups.Groups.CR`는 다음과 같이 나뉜다.  

|       head        | middle | tail  |
| :---------------: | :----: | :---: |
| group_id`:`groups | Groups |  CR   |

각 파트는 `:`를 기준으로 나뉜다.
- `head`   : \<field-name\>`:`\<as-name\>
- `middle` : \<table-name\>`
- `tail`   : \<change-options\>

이 규칙에 따라, 예제 `@group_id:groups.Groups.CR`를 분류하면 다음과 같다.  

| field-name | as-name | table-name | change-options |
| :--------: | :-----: | :--------: | :------------: |
|  group_id  | groups  |   Groups   |       CR       |

각 분류의 설명은 다음과 같다.  
## head
- `field-name`:  
  쿼리를 사용할때나, 외부에 보여지는 필드 이름. 맨앞에 `@`가 추가로 붙는다.  
  예제의 경우, `@group_id`가 되며, `Users__Groups` 쿼리 결과는 다음과 같이 된다.
  ```json
  {
    "id": 102,
    "@user_id": 3,
    "@group_id": 4,
  }
  ```
- `as-name`:  
  쿼리를 사용할때, include에서 association 부분에 들어갈 이름(belongsTo). 맨앞에 `*`가 추가로 붙는다.  
  예제의 경우, `*groups`이 되며, 다음과 같이 쿼리를 사용할 수 있다.
  ```javascript
  // User 에서 쿼리를 날림
  {
    where: { id: 102 },
    include: [
      { association: '*groups' },
    ],
  }
  ```
  쿼리의 결과는 다음과 같이 된다.
  ```json
  {
    "id": 102,
    "name": "john",
    // 나머지 유저 정보

    "*groups": [
      { // Group 정보들
        "id": 4,
        "name": "ys",
        // 나머지 그룹 정보
      },
      ...
    ],
  }
  ```
  > `field-name`이 `abcde_id` 처럼, 맨 뒤가 `_id`로 끝나는 형식일때, `as-name`을 생략할 수 있다.  
  > 생략하면 `_id` 이전의 내용인 `as-name` + `s` 가 된다.(abcdes)
  > 
  > 예를 들어, `@group_id:groups.Groups.CR` 에서 `:groups` 부분을 생략해 보자.  
  > `@group_id.Groups.CR` 이런식으로 사용해도, `field-name`이 `_id`로 끝나기 때문에,  
  > 생략전과 동일하게, `as-name`은 `*groups`이 된다.

## middle
- `table-name`:  
  foreign key target의 table 이름.  
  예제의 경우, 테이블 이름은 `Groups` 이다. (Sequelize에서는 기본으로 Model이름 뒤에 `s`를 붙여 테이블 이름을 만든다)

## tail
- `change-options`:  
  두 문자로 이루어진다. 순서대로 `onUpdate`, `onDelete` 옵션을 의미한다.  
  총 다섯 가지의 옵션이 있다.  
  - `R`: RESTRICT
  - `C`: CASCADE
  - `X`: NO ACTION
  - `D`: SET DEFAULT
  - `N`: SET NULL
  예제의 경우, `CR`이기 때문에, onUpdate는 `CASCADE`, onDelete는 `RESTRICT`가 된다.  
  > 생략 가능하다. 생략하면, Sequelize의 기본 옵션으로 된다.

# comment 활용
이름에 모든 세팅을 넣으면 너무 길어질 수 있기 때문에, `field-name` 이외에 일부를 `comment`에 넣을 수 있다.  
`comment`에 넣을 때 에는 다음과 같은 규칙을 지켜야 한다.  

- 맨 첫줄에, 한줄로 넣어야 함
- 맨 앞에 &를 넣어야 함

즉 예제 `@group_id:groups.Groups.CR`가 너무 길기 때문에,  
필드 이름은 `@group_id`로 하고, 나머지를 comment에 `&:groups.Groups.CR`와 같이 넣을 수 있다. (그리고 이를 권장한다)

예제 코드는 다음과 같다.
```javascript
const db = connect();
const Users__Groups = db.define('Users__Groups',
  { // field infos
    id: {
        type         : Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey   : true,
        allowNull    : false,
    },
    '@user_id': {    /*** field ***/
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: '&:users.Users.CR',  /*** comment ***/
    },
    '@group_id': {    /*** field ***/
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: '&:groups.Groups.CR',  /*** comment ***/
    },
    name     : { type: Sequelize.STRING( 40), allowNull: false, },
  },
  { // options
    indexes: [
      { fields: ['@user_id' ], name: 'user_id' , },
      { fields: ['@group_id'], name: 'group_id', },
    ],
    charset: 'utf8mb4',
    collate: 'utf8mb4_general_ci'
  },
);

const User  = require('./User' );
const Group = require('./Group');

db_util.linkByManyToMany(Users__Groups, [User, Group, ]);

module.exports = Users__Groups;
```
> `field-name`이 `_id`로 끝나기 때문에, `as-name`을 생략해도 `*groups`으로 설정된다.  
> 따라서 `:groups`를 생략해도 동일하게 동작한다.  
> 이렇게 생략한 결과가, `간단 예제` 부분 이다.  

> `comment`의 시작기호 `&`를 제외한 첫 번째 문자가 `.`이라면, 이 또한 생략 가능하다.  
> 예를 들어, `comment`가 `&.Groups.CR` 라면, 맨 처음 `.`을 생략하여,  
> `&Groups.CR` 처럼 사용할 수 있다.  
