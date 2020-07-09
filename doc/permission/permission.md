# 개요
`permission`에 관한 문서  
유저의 `permission_json` 정보와 메커니즘 설명.  

`CRUD permission`과, `hidden field permission`으로 나뉜다.

&nbsp;  
&nbsp;  
# 설명
## 예제
```js
[
    // for CRUD
    "Group/%group_id",
    "User/%id,@group_id:group_id",
    "Event/read",
    "Event/update%@user_id:id",
    "Event/delete{where:{'@user_id':%.id}}",

    // for hidden field
    "#User/password_hash/read",
    "#Group/password_hash/read%id:id,@group_id:group_id",
    "#Admin/password_hash/read%id",
]
```

&nbsp;  
## CRUD permission 구조
크게 `리소스`, `CRUD`, `쿼리` 파트로 나뉜다.  
어떤 `리소스`를 어떤 `CRUD방식`으로 접근이 가능한지를 의미한다.  
`쿼리`는 optional 한데, 있다면 CRUD 각각의 방식에서 특정한 필드 값을 고정하거나 값을 확인하는 방식으로 권한 체크를 한다.  

&nbsp;  
### 리소스와 CRUD
일단 `Event/read` 예제를 보자.

`Event`가 리소스 이고, `read`가 CRUD 부분이며, 쿼리는 없다.  
즉, 이 권한으로 `Event` 리소스를 `read`할 수 있다.

만일 `Event/` 처럼, CRUD파트가 생략 되었다면, create/read/update/delete 모두 가능한 것이다.  

&nbsp;  
### 쿼리
쿼리는 `긴 쿼리`과 `짧은 쿼리` 두가지가 있다.  
쿼리가 있는 경우, CRUD에 따라 다음 처럼 동작한다.

- create : `permission 쿼리`에 포함된 필드의 값이 고정된다.
- read : 항상 검색 쿼리에 `permission 쿼리`를 merge 하여 검색한다.
- update : 검색 쿼리에 `permission 쿼리`를 merge 하여, 해당 row를 수정한다.
- delete : 검색 쿼리에 `permission 쿼리`를 merge 하여, 해당 row를 삭제한다.

&nbsp;  
#### 긴 쿼리
`"Event/delete{where:{'@user_id':%.id}}"`가 긴 쿼리의 예 이다.

리소스 파트는 `Event`, CRUD파트는 `delete` 이며, `{where:{'@user_id':%.id}}`가 쿼리 부분이다.  
쿼리 부분에서 `%` 기호는 `토큰`이다.  
즉, `@user_id`라는 필드의 값이 `토큰.id` 값과 같을 때만, 해당 event를 지울 수 있다.

&nbsp;  
#### 짧은 쿼리
`"Event/update%@user_id:id"` 예제를 보자.

리소스 파트는 `Event`, CRUD파트는 `update` 이며, `%@user_id:id`가 쿼리 부분이다.  
짧은 쿼리에서는, `%` 기호 다음에 `"key:value, key:value, ..."` 형식으로 쿼리를 작성한다.  
짧은 쿼리는, value 부분이 항상 `토큰.value`라고 가정한다.  
즉 이 경우에는, `@user_id` 필드의 값이 `토큰.id` 값과 같을 때만, 해당 event를 수정할 수 있다.

아예, `key`부분을 생략 가능하다. 생략하면 `key`는 `id`라고 가정한다.  
`"User/%id,@group_id:group_id"` 와 같은 짧은 쿼리를 긴 쿼리로 바꿔보면,  
`"User/{where:{id:%.id, '@group_id':%.group_id }}"` 가 된다.  
두 쿼리는 완전히 동일한 동작을 한다.  

&nbsp;  
#### 각 짧은 쿼리와 동일한 긴 쿼리 예제
```js
// 짧은 쿼리
"Group/%group_id"

// 긴 쿼리
"Group/{where:{id:%.group_id}}"
```

```js
// 짧은 쿼리
"User/%id,@group_id:group_id"

// 긴 쿼리
"User/{where:{id:%.id,'@group_id':%.group_id}}"
```

```js
// 짧은 쿼리
"Event/update%@user_id:id"

// 긴 쿼리
"Event/update{where:{'@user_id':%.id}}"
```

&nbsp;  
## hidden field permission 구조
\#로 시작한다
크게 `permission 이름`, `read/write`, `쿼리` 파트로 나뉜다.  
hidden 필드에 대해 부여된 권한 `permission 이름`이 있는지를 의미하며, `read` 혹은 `write` 가 가능하다는 것을 의미한다.  
`쿼리`는 optional 한데, 있다면 token의 정보를 이용해 권한 제한을 한다.  

&nbsp;  
### permission 이름
일단 `#User/password_hash/read` 예제를 보자.

`User/password_hash`가 `permission 이름` 이고, `read` 권한이 있으며, 쿼리는 없다.  
즉, 이 권한으로 `#User/password_hash` 라는 permission을 가진 hidden field를 `read` 할 수 있다.

만일 `#User/password_hash/` 처럼, `read/write` 파트가 생략 되었다면, read/write 모두 가능한 것이다.  

&nbsp;  
#### 쿼리
`#Group/password_hash/read%id:id,@group_id:group_id`가 쿼리의 예 이다.

permission 이름은 `Group/password_hash`이고, `read` 권한을 가지고 있으며, `id:id,@group_id:group_id`가 쿼리 부분이다.  
hidden field 쿼리에서는, `%` 기호 다음에 `"key:value, key:value, ..."` 형식으로 쿼리를 작성한다.  
즉, `id`라는 필드의 값이 `토큰.id` 값과 같고, `@group_id`값이 `토큰.group_id`와 같을 때만, 해당 hidden field를 읽을 수 있다.

아예, `key`부분을 생략 가능하다. 생략하면 `key`는 `id`라고 가정한다.  
`"#Admin/password_hash/read%id"` 와 같은 경우,  
`"#Admin/password_hash/read%id:id"` 와 정확하게 같다.