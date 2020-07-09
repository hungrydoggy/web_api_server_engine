# 개요
작성된 api 리스트를 정리한 문서  
일반 CRUD api와 기타 특수 api로 분류 된다.
&nbsp;  
&nbsp;  
&nbsp;  

# 형식 설명
## 일반 CRUD api 형식
REST형식으로 구현되어 있다.  
- Create: `POST` /api/&lt;resource&gt;
- Read: `GET` /api/&lt;resource&gt;
- Read(id별): `GET` /api/&lt;resource&gt;/&lt;id&gt;
- Update: `PUT`    /api/&lt;resource&gt;/&lt;id&gt;
- Delete: `DELETE` /api/&lt;resource&gt;/&lt;id&gt;
> resource 부분은 소문자와 `-`으로 이루어져 있다.  
> 예를 들어, AdminUsers 테이블의 경우는 `'/api/admin-users'` 형식이다.

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
> Resource 부분은 Table의 이름에서 마지막 s를 뺀 것이다.  
> 예를 들어, AdminUsers 테이블의 read 권한을 지정하려면  
> `'AdminUser/read'` 를 지정해 주면 된다.

&nbsp;  

## 특수 api 형식
역시, REST형식으로 구현되어 있다.  
request시에 공통된 형식이 없으며, 각 api 마다 약속된 파라미터를 json형식으로 넣어야 한다.
```javascript
{
    name: 'abc',      // 예제
    test_param: 123,  // 예제
}
```

response와 권한 또한 각 api마다 다르다.
&nbsp;  
&nbsp;  
&nbsp;  

# api 리스트
## 일반 CRUD api
- AdminUsers  
  | method   | path                        | permission       |
  | :------- | :-------------------------- | :--------------- |
  | `POST`   | /api/admin-users            | AdminUser/create |
  | `GET`    | /api/admin-users            | AdminUser/read   |
  | `GET`    | /api/admin-users/&lt;id&gt; | AdminUser/read   |
  | `PUT`    | /api/admin-users/&lt;id&gt; | AdminUser/update |
  | `DELETE` | /api/admin-users/&lt;id&gt; | AdminUser/delete |
&nbsp;  
- Drivers  
  | method   | path                    | permission    |
  | :------- | :---------------------- | :------------ |
  | `POST`   | /api/drivers            | Driver/create |
  | `GET`    | /api/drivers            | Driver/read   |
  | `GET`    | /api/drivers/&lt;id&gt; | Driver/read   |
  | `PUT`    | /api/drivers/&lt;id&gt; | Driver/update |
  | `DELETE` | /api/drivers/&lt;id&gt; | Driver/delete |
&nbsp;  
- EventHasResources  
  | method   | path                                | permission              |
  | :------- | :---------------------------------- | :---------------------- |
  | `POST`   | /api/event-has-resources            | EventHasResource/create |
  | `GET`    | /api/event-has-resources            | EventHasResource/read   |
  | `GET`    | /api/event-has-resources/&lt;id&gt; | EventHasResource/read   |
  | `PUT`    | /api/event-has-resources/&lt;id&gt; | EventHasResource/update |
  | `DELETE` | /api/event-has-resources/&lt;id&gt; | EventHasResource/delete |
&nbsp;  
- EventLocations  
  | method   | path                            | permission           |
  | :------- | :------------------------------ | :------------------- |
  | `POST`   | /api/event-locations            | EventLocation/create |
  | `GET`    | /api/event-locations            | EventLocation/read   |
  | `GET`    | /api/event-locations/&lt;id&gt; | EventLocation/read   |
  | `PUT`    | /api/event-locations/&lt;id&gt; | EventLocation/update |
  | `DELETE` | /api/event-locations/&lt;id&gt; | EventLocation/delete |
&nbsp;  
- Events  
  | method   | path                   | permission   |
  | :------- | :--------------------- | :----------- |
  | `POST`   | /api/events            | Event/create |
  | `GET`    | /api/events            | Event/read   |
  | `GET`    | /api/events/&lt;id&gt; | Event/read   |
  | `PUT`    | /api/events/&lt;id&gt; | Event/update |
  | `DELETE` | /api/events/&lt;id&gt; | Event/delete |
&nbsp;  
- GlobalVars  
  | method   | path                        | permission       |
  | :------- | :-------------------------- | :--------------- |
  | `POST`   | /api/global-vars            | GlobalVar/create |
  | `GET`    | /api/global-vars            | GlobalVar/read   |
  | `GET`    | /api/global-vars/&lt;id&gt; | GlobalVar/read   |
  | `PUT`    | /api/global-vars/&lt;id&gt; | GlobalVar/update |
  | `DELETE` | /api/global-vars/&lt;id&gt; | GlobalVar/delete |
&nbsp;  
- Groups  
  | method   | path                   | permission   |
  | :------- | :--------------------- | :----------- |
  | `POST`   | /api/groups            | Group/create |
  | `GET`    | /api/groups            | Group/read   |
  | `GET`    | /api/groups/&lt;id&gt; | Group/read   |
  | `PUT`    | /api/groups/&lt;id&gt; | Group/update |
  | `DELETE` | /api/groups/&lt;id&gt; | Group/delete |
&nbsp;  
- PermissionGroups  
  | method   | path                              | permission             |
  | :------- | :-------------------------------- | :--------------------- |
  | `POST`   | /api/permission-groups            | PermissionGroup/create |
  | `GET`    | /api/permission-groups            | PermissionGroup/read   |
  | `GET`    | /api/permission-groups/&lt;id&gt; | PermissionGroup/read   |
  | `PUT`    | /api/permission-groups/&lt;id&gt; | PermissionGroup/update |
  | `DELETE` | /api/permission-groups/&lt;id&gt; | PermissionGroup/delete |
&nbsp;  
- Resources  
  | method   | path                      | permission      |
  | :------- | :------------------------ | :-------------- |
  | `POST`   | /api/resources            | Resource/create |
  | `GET`    | /api/resources            | Resource/read   |
  | `GET`    | /api/resources/&lt;id&gt; | Resource/read   |
  | `PUT`    | /api/resources/&lt;id&gt; | Resource/update |
  | `DELETE` | /api/resources/&lt;id&gt; | Resource/delete |
&nbsp;  
- Samplers  
  | method   | path                     | permission     |
  | :------- | :----------------------- | :------------- |
  | `POST`   | /api/samplers            | Sampler/create |
  | `GET`    | /api/samplers            | Sampler/read   |
  | `GET`    | /api/samplers/&lt;id&gt; | Sampler/read   |
  | `PUT`    | /api/samplers/&lt;id&gt; | Sampler/update |
  | `DELETE` | /api/samplers/&lt;id&gt; | Sampler/delete |
&nbsp;  
- SamplingMethods  
  | method   | path                             | permission            |
  | :------- | :------------------------------- | :-------------------- |
  | `POST`   | /api/sampling-methods            | SamplingMethod/create |
  | `GET`    | /api/sampling-methods            | SamplingMethod/read   |
  | `GET`    | /api/sampling-methods/&lt;id&gt; | SamplingMethod/read   |
  | `PUT`    | /api/sampling-methods/&lt;id&gt; | SamplingMethod/update |
  | `DELETE` | /api/sampling-methods/&lt;id&gt; | SamplingMethod/delete |
&nbsp;  
&nbsp;  

## 특수 api
- `POST` /api/auth/admin-users/login: 관리자 유저 로그인  
  - request params  
    |key|description|
    |:--|:----------|
    |login_id|로그인 아이디|
    |password|패스워드|
&nbsp;  
- `POST` /api/auth/admin-users/check-token: 관리자 유저 토큰 체크
  - request params  
    |key|description|
    |:--|:----------|
    |id|AdminUsers.id|
    |token|로그인 토큰|
&nbsp;  
- `POST` /api/auth/drivers/login: 운송자 유저 로그인  
  - request params  
    |key|description|
    |:--|:----------|
    |login_id|로그인 아이디|
    |password|패스워드|
&nbsp;  
- `POST` /api/auth/drivers/send-pw-code: 운송자 유저 패스워드 찾기 요청  
  - request params  
    |key|description|
    |:--|:----------|
    |login_id|로그인 아이디|
    |email|이메일|
&nbsp;  
- `PUT` /api/auth/drivers/send-pw-code: 운송자 유저 패스워드 재설정  
  - request params  
    |key|description|
    |:--|:----------|
    |login_id|로그인 아이디|
    |code_for_new_password|패스워드 코드|
    |new_password|새 비밀번호|
&nbsp;  
- `POST` /api/resources/s3-credential: s3에 리소스를 업로드하기위한 credential 요구  
  - request params  
    |key|description|
    |:--|:----------|
    |hash|파일을 해시한 값|
    |type|확장자|
&nbsp;  