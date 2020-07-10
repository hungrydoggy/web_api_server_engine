# 개요
api의 특징을 정리한 문서  
`CRUD api`와 `Custom api`로 분류 된다.
&nbsp;  
&nbsp;  
&nbsp;  

# 형식 설명
## CRUD api 형식
REST형식으로 구현되어 있다.  
  | 동작       | method   | path                             |
  | :--------- | :------- | :------------------------------- |
  | Create     | `POST`   | /api/&lt;resource&gt;            |
  | Read       | `GET`    | /api/&lt;resource&gt;            |
  | Read(id별) | `GET`    | /api/&lt;resource&gt;/&lt;id&gt; |
  | Update     | `PUT`    | /api/&lt;resource&gt;/&lt;id&gt; |
  | Delete     | `DELETE` | /api/&lt;resource&gt;/&lt;id&gt; |
> resource 부분은 소문자와 `-`으로 이루어져 있으며 복수형이다.  
> 예를 들어, AdminUser 테이블의 경우는 `'/api/admin-users'` 형식이다.

&nbsp;  

request 시에, 각 파라미터 넣는 형식은 다음과 같다.
```javascript
{
    params: {   // Create, Update 시에 추가하거나 수정할 파라미터
        name: 'john',
        email: 'abc@def.com',
    },
    options: {   // 검색 쿼리
        where: {
            id: 3,
        },
    },
}
```
위 예제 처럼, 크게 두 가지로 구성된다.
- params: 해당 row의 data를 수정/추가 할때 사용된다.
- options: 어떤 row의 data를 검색할지 쿼리로 사용된다.
> 어떤 파라미터가 있는지는, 데이터베이스 테이블의 필드를 참고하면 된다.  
> 혹은 `src/db/models` 부분 코드를 참고해도 된다.  
> `#password_hash` 필드 같은 경우는 예외로, `'password'`를 키로 하여 패스워드값을 넣으면 된다.

> 쿼리의 경우는, Sequelize 쿼리와 동일한 쿼리를 사용하며,  
> [Sequelize.Op.gt] 와 같은 부분은 `$gt` 형식을 사용한다.

&nbsp;  

response는 다음과 같이 온다.
```javascript
{
    message: 'ok',  // or error message
    items: [
        <item_object>,
        <item_object>,
        ...
    ],
}
```
&nbsp;  

각 api의 권한은 다음과 같은 형식이다.  
- &lt;Resource&gt;/create
- &lt;Resource&gt;/read
- &lt;Resource&gt;/update
- &lt;Resource&gt;/delete
> 예를 들어, AdminUser 테이블의 read 권한을 지정하려면  
> `'AdminUser/read'` 를 지정해 주면 된다.

&nbsp;  

## Custom api 형식
request시에 공통된 형식이 없으며, 각 api 마다 약속된 파라미터를 json형식으로 넣어야 한다.
```javascript
{
    name: 'abc',      // 예제
    test_param: 123,  // 예제
}
```

response와 권한 또한 각 api마다 다르다.