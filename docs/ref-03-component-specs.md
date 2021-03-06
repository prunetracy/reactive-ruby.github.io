---
id: component-specs
title: Component Specs and Lifecycle
permalink: component-specs.html
prev: component-api.html
next: tags-and-attributes.html
---

## Lifecycle Methods

A component class may define callbacks for  specific points in a component's lifecycle.

### Mounting: `before_mount`

```ruby
before_mount do ...
end
```

Invoked once when the component is first instantiated, immediately before the initial rendering occurs. This is where state variables should
be initialized.

This is the only life cycle method that is called during `render_to_string` used in server side pre-rendering. 

### Mounting: `after_mount`

```ruby
after_mount do ...
end
```

Invoked once, only on the client (not on the server), immediately after the initial rendering occurs. At this point in the lifecycle, you can access any refs to your children (e.g., to access the underlying DOM representation). The `after_mount` callbacks of children components are invoked before that of parent components.

If you want to integrate with other JavaScript frameworks, set timers using the `after` or `every` methods, or send AJAX requests, perform those operations in this method.  Attempting to perform such operations in before_mount will cause errors during prerendering because none of these operations are available in the server environment.


### Updating: `before_receive_props`

```ruby
before_receive_props do |new_params_hash| ...
end
```

Invoked when a component is receiving *new* params (React.js props). This method is not called for the initial render.

Use this as an opportunity to react to a prop transition before `render` is called by updating any instance or state variables. The 
new_props block parameter contains a hash of the new values.

```ruby
before_receive_props do |next_props|
  state.likes_increasing! (next_props[:like_count] > params.like_count)
end
```

> Note:
>
> There is no analogous method `before_receive_state`. An incoming param may cause a state change, but the opposite is not true. If you need to perform operations in response to a state change, use `before_update`.


### Updating: the `should_component_update?` method

Normally react.rb will only update a component if some state variable or param has changed.  To override this behavior you can redefine the `should_component_update?` instance method.  For example, assume that we have a state called `funky` that for whatever reason, we
cannot update using the normal `state.funky!` update method.  So what we can do is override `should_component_update?` call `super`, and then double check if the `funky` has changed by doing an explicit comparison.

```ruby
class RerenderMore < React::Component::Base
  def should_component_update?(new_params_hash, new_state_hash)
    super || new_state_hash[:funky] != state.funky
  end
end
```

Why would this happen?  Most likey there is integration between new React.rb components and other data structures being maintained outside of React.rb, and so we have to do some explicit comparisions to detect the state change. 

Note that `should_component_update?` is not called for the initial render or when `force_update!` is used.

> Note to react.js readers.  Essentially React.rb assumes components are "well behaved" in the sense that all state changes
> will be explicitly declared using the state update ("!") method when changing state.  This gives similar behavior to a 
> "pure" component without the possible performance penalties.
> To achieve the standard react.js behavior add this line to your class `def should_component_update?; true; end`

### Updating: `before_update`

```ruby
before_update do ...
end
```

Invoked immediately before rendering when new params or state are being received.  


### Updating: after_update

```ruby
before_update do ...
end
```

Invoked immediately after the component's updates are flushed to the DOM. This method is not called for the initial render.

Use this as an opportunity to operate on the DOM when the component has been updated.


### Unmounting: componentWillUnmount

```ruby
before_unmount do ...
end
```

Invoked immediately before a component is unmounted from the DOM.

Perform any necessary cleanup in this method, such as invalidating timers or cleaning up any DOM elements that were created in the `after_mount` callback.
