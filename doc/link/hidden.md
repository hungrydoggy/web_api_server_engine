# 개요
숨겨진 필드에 관한 문서  
필드를 기본 숨겨주고, 권한이 있는 사용자만 read/write 할 수 있다.  

# 간단 예제
컬럼 이름 맨 앞에 `#`를 붙여서 사용한다.
```javascript
const db = connect();
const User = db.define('User',
  { // field infos
    id: {
        type         : Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey   : true,
        allowNull    : false,
    },
    login_id: { type: Sequelize.STRING( 40), allowNull: false, },
    '#password_hash': {
      type: Sequelize.STRING(100),
      allowNull: false,
      comment: '&AdminUsers/#password_hash:AllUsers/#password_hash',
    },
  },
  { // options
    indexes: [
      { fields: ['login_id'   ], unique: true, },
    ],
    charset: 'utf8mb4',
    collate: 'utf8mb4_general_ci'
  },
);

db_util.link(User, [User, ]);

module.exports = User;
```
`#passwordhash`를 read 하려면 `AdminUsers/#password_hash/read`를,  
write 하려면 `AdminUsers/#password_hash/write`를 권한으로 가진 유저여야 한다.  
혹은 `AdminUsers/#password_hash/`를 가진 유저라면 둘 다 가능하다.  

# 기본 규칙
다음은 생략이 없는 기본 규칙의 예제다.
```javascript
'#password_hash.AdminUsers/#password_hash:AllUsers/#password_hash': {  /*** field ***/
  type: Sequelize.STRING(100),
  allowNull: false,
},
```
기본적으로, 컬럼의 `이름`으로 설정하며, 맨 앞에 `#`가 붙게 된다.

`.`을 기준으로 크게 2부분으로 나뉜다.  
`#`\<head\>`.`\<tail\>  

따라서 예제 `#password_hash.AdminUsers/#password_hash:AllUsers/#password_hash`는 다음과 같이 나뉜다.  

|     head     |  tail  |
| :----------: |  :---: |
| password_hash |   AdminUsers/#password_hash`:`AllUsers/#password_hash   |

각 파트는 `:`를 기준으로 나뉜다.
- `head`: \<field-name\>`
- `tail`: \<permission1\>`:`\<permission2\>`:`...

이 규칙에 따라, 예제 `#password_hash.AdminUsers/#password_hash:AllUsers/#password_hash`를 분류하면 다음과 같다.  

| field-name | permission1 | permission2 |
| :--------: | :-----: | :--------: |
|   password_hash   |   AdminUsers/#password_hash   |   AllUsers/#password_hash       |

각 분류의 설명은 다음과 같다.  
## head
- `field-name`:  
  쿼리를 사용할때나, 외부에 보여지는 필드 이름. 맨앞에 `#`가 추가로 붙는다.  
  예제의 경우, `#password_hash`가 되며, 쿼리 결과는 다음과 같이 된다.
  ```json
  {
    "id": 102,
    "login_id": "john",
    "#password_hash": "~", // 권한이 없으면 결과에 포함되지 않음
  }
  ```

## tail
- `permission`들:  
  이 필드를 read/write 할때 필요한 권한 이름.  
  예제의 경우, 유저가 `AdminUser/#password_hash` 혹은 `AllUser/#password_hash` 권한의 `read`, `write`를 가지고 있는지 여부에 따라, 결과 쿼리에 필드가 포함되거나 수정할 수 있게 된다.  

  > 예를 들어,
  > - `AdminUser/#password_hash/read`: 읽기 가능
  > - `AdminUser/#password_hash/write`: 쓰기 가능
  > - `AdminUser/#password_hash/`: 둘 다 가능

# comment 활용
comment의 활용은 association.md 문서와 같다.
